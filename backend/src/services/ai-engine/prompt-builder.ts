import { type CartState, type SupportedLanguage, formatCartForPrompt, calculateCartTotal } from './cart-state.js';
import type { RestaurantContext } from './restaurant-context.js';

const CACHE_TTL_MS = 600000; // 10 minutes
const systemPromptCache = new Map<string, { template: string; expires: number }>();

/**
 * Detect language from message text.
 * Only auto-detects if the message has significant linguistic content
 * (length > 15 chars) to avoid flipping language on short replies
 * like "ok", "yes", "تمام", "👍".
 *
 * Returns null for short/ambiguous messages — caller should keep
 * the existing language instead of switching.
 */
export function detectLanguage(text: string): SupportedLanguage | null {
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (hasArabic) return 'ar';
  if (text.length < 15) return null;
  return 'en';
}

function formatDeliveryTiers(context: RestaurantContext): string {
  if (context.deliveryTiers.length === 0) return '';

  let result = 'Delivery fees (distance-based):\n';
  for (const tier of context.deliveryTiers) {
    result += `- Up to ${tier.maxKm} km: ${tier.fee} ${context.currency}\n`;
  }
  if (context.maxDeliveryDistanceKm) {
    result += `Max delivery distance: ${context.maxDeliveryDistanceKm} km\n`;
  }
  return result;
}

export function buildSystemPrompt(params: {
  businessId: string;
  language: SupportedLanguage;
  cartState: CartState;
  context: RestaurantContext;
  customerName?: string;
  customerPhone?: string;
}): string {
  const { businessId, language, cartState, context, customerName, customerPhone } = params;
  const cacheKey = `${businessId}:${language}`;

  const cached = systemPromptCache.get(cacheKey);
  let template: string;

  if (cached && cached.expires > Date.now()) {
    template = cached.template;
  } else {
    const orderTypes: string[] = [];
    if (context.deliveryEnabled) orderTypes.push('delivery');
    if (context.dineInEnabled) orderTypes.push('dine-in');
    if (context.pickupEnabled) orderTypes.push('pickup');
    const orderTypeStr = orderTypes.join(', ');

    const contextLines: string[] = [
      `${context.restaurantName} | ${context.isTemporarilyClosed ? 'CLOSED' : `${context.openingTime}-${context.closingTime}`} | ${context.currency}`,
      `Payment: ${context.paymentMethods.join(', ')}`,
    ];
    if (orderTypes.length > 0) contextLines.push(`Types: ${orderTypeStr}`);
    if (context.estimatedPrepTimeMinutes) contextLines.push(`Prep: ~${context.estimatedPrepTimeMinutes} min`);
    if (context.deliveryEnabled) {
      contextLines.push(formatDeliveryTiers(context));
    }
    const contextBlock = contextLines.join('\n');

    const langInstr =
      language === 'ar'
        ? 'Respond only in Arabic (Saudi casual dialect).'
        : 'Respond only in English.';

    const workflowSteps: string[] = [];
    let step = 1;
    workflowSteps.push(`${step++}. IF order type not set yet: ask customer (${orderTypeStr}).`);
    workflowSteps.push(context.deliveryEnabled
      ? `${step++}. IF delivery AND no address set yet: ask customer to share location or type address. When location is shared, you'll receive [Location shared: lat,lng]. Call set_delivery_address with coordinates. When address is typed, call set_delivery_address with the address text.`
      : `${step++}. IF delivery: unavailable for this restaurant. Say so.`);
    workflowSteps.push(`${step++}. query_menu to browse items. When customer picks items, use add_to_cart.`);
    workflowSteps.push(`${step++}. If customer wants to change quantity/option/notes of an existing item, use update_cart with the 0-based [index] from CURRENT CART.`);
    workflowSteps.push(`${step++}. Customer done → ask: "shall I place the order?". Review cart items with customer.`);
    workflowSteps.push(`${step++}. Customer explicitly says yes → call submit_order. Items, orderType, address and phone are auto-filled from cart state.`);
    workflowSteps.push(`${step++}. After submit: done. Don't offer repeats. New orders start fresh from step 1.`);

    template = `## ROLE
${langInstr}

WhatsApp ordering assistant for ${context.restaurantName}. Be warm, casual, concise. Vary phrasing naturally. Don't repeat greetings/closings. Keep replies under 3 lines. Match customer energy. Use 1-2 emojis naturally but sparingly.

## CONTEXT
${contextBlock}

## WORKFLOW (only do steps not yet completed)
${workflowSteps.join('\n')}

## GUARDRAILS
- Do NOT call submit_order until customer EXPLICITLY says yes to "shall I place the order?". A bare "yes"/"ok"/"تمام" during browsing means general acknowledgment — NOT order confirmation.
- Use item names AND option IDs from query_menu results EXACTLY as shown. Do NOT substitute or guess.
- If options exist on an item: MUST ask customer which option, then pass optionId in add_to_cart.
- Customer changes mind / removes / hesitates: do NOT submit.
- upsell at most once. If customer says no or ignores: proceed to confirmation.
- query_menu again if customer wants to browse or you need correct names/IDs.
- check_restaurant_info for address/hours/payment/delivery questions — do NOT make up info.
- After submit: done with this order. If customer wants more, they start fresh.

## TOOLS
- query_menu: "what do you have?" or specific item search — returns item IDs and option IDs
- add_to_cart: add selected items to cart (bulk — pass all items at once). Use optionId from query_menu.
- update_cart: modify a cart item at a specific [index]. Pass FULL updated values.
- check_restaurant_info: "where are you?", "are you open?", "what payments?", "how much is delivery?"
- set_delivery_address: save delivery location + calculate fee
- submit_order: create order — items auto-filled from cart. Only call after customer says yes.
- check_order_status: "where is my order?"
- file_complaint: customer reports a problem
`;

    systemPromptCache.set(cacheKey, {
      template,
      expires: Date.now() + CACHE_TTL_MS,
    });
  }

  const progressParts: string[] = [];
  if (cartState.orderType) {
    progressParts.push('✅ Order type: ' + cartState.orderType);
  } else {
    progressParts.push('⬜ Order type: not set');
  }
  if (cartState.deliveryLocation) {
    progressParts.push('✅ Address: ' + cartState.deliveryLocation.address);
  } else if (cartState.orderType === 'delivery') {
    progressParts.push('⬜ Address: not set');
  }
  if (cartState.items.length > 0) {
    progressParts.push(`🛒 Cart: ${cartState.items.length} item(s) (${calculateCartTotal(cartState.items).toFixed(2)} ${context.currency})`);
  } else {
    progressParts.push('⬜ Cart: empty');
  }

  const sessionParts: string[] = [];
  if (customerName || customerPhone) {
    const nameStr = customerName || '';
    const phoneStr = customerPhone || '';
    sessionParts.push(`${nameStr}${nameStr && phoneStr ? ' / ' : ''}${phoneStr}`);
  }
  sessionParts.push(`Language: ${language === 'ar' ? 'Arabic' : 'English'}`);

  const sessionSection = sessionParts.length > 0 ? `\n## SESSION\n${sessionParts.join('\n')}` : '';
  const progressSection = `\n## PROGRESS\n${progressParts.join('\n')}`;
  const cartSection = `\n## CURRENT CART\n${formatCartForPrompt(cartState, context.currency)}`;
  return template + sessionSection + progressSection + cartSection;
}

export function sanitizeToolOutput(output: string): string {
  const cleaned = output.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const MAX_TOOL_OUTPUT_LENGTH = 4000;
  if (cleaned.length > MAX_TOOL_OUTPUT_LENGTH) {
    return cleaned.substring(0, MAX_TOOL_OUTPUT_LENGTH) + '\n[Output truncated]';
  }
  return cleaned;
}
