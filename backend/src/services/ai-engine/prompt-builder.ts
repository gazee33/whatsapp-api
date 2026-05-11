import { type CartState, type SupportedLanguage, formatCartForPrompt } from './cart-state.js';
import type { RestaurantContext } from './restaurant-context.js';

const CACHE_TTL_MS = 600000; // 10 minutes
const systemPromptCache = new Map<string, { template: string; expires: number }>();

export function detectLanguage(text: string): SupportedLanguage {
  return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

export function shouldMarkConfirmationRequested(reply: string): boolean {
  const lower = reply.toLowerCase();
  return (
    lower.includes('confirm') ||
    lower.includes('place the order') ||
    lower.includes('تأكيد') ||
    lower.includes('تأكد') ||
    lower.includes('أأكد') ||
    lower.includes('اعتمد') ||
    lower.includes('تنفيذ الطلب')
  );
}

export function buildSystemPrompt(params: {
  businessId: string;
  language: SupportedLanguage;
  cartState: CartState;
  context: RestaurantContext;
}): string {
  const { businessId, language, cartState, context } = params;
  const cacheKey = `${businessId}:${language}`;

  const cached = systemPromptCache.get(cacheKey);
  let template: string;

  if (cached && cached.expires > Date.now()) {
    template = cached.template;
  } else {
    const langInstr =
      language === 'ar'
        ? 'Respond only in Arabic, preferably Saudi casual Arabic.'
        : 'Respond only in English.';

    const orderTypes: string[] = [];
    if (context.deliveryEnabled) orderTypes.push('delivery');
    if (context.dineInEnabled) orderTypes.push('dine-in');
    if (context.pickupEnabled) orderTypes.push('pickup');
    const orderTypeStr = orderTypes.length > 0 ? `Order types: ${orderTypes.join(', ')}` : '';

    const locationStr = context.address
      ? `📍 ${context.address}${context.phoneNumber ? ` ☎️ ${context.phoneNumber}` : ''}`
      : '';

    const paymentStr = `💳 ${context.paymentMethods.join(', ')}`;

    const hoursStr = context.isTemporarilyClosed
      ? '🕐 TEMPORARILY CLOSED'
      : `🕐 ${context.openingTime}-${context.closingTime}`;

    const prepStr = context.estimatedPrepTimeMinutes
      ? `⏱️ Prep time: ~${context.estimatedPrepTimeMinutes} min`
      : '';

    template = `${langInstr}

You are the AI ordering assistant for ${context.restaurantName}.
${hoursStr} | ${context.currency} | ${paymentStr}
${orderTypeStr}
${locationStr}
${prepStr}
${context.aiRules ? `\nRules: ${context.aiRules}` : ''}

Behavior:
- WhatsApp ordering assistant, be warm, casual, and friendly — like chatting with a restaurant worker on WhatsApp.
- Dont be hurry to confirm and submit the order, we need customer to order as much as possible.

ORDER FLOW:
1. First, ask if they want delivery, dine-in, or pickup (based on available types: ${orderTypeStr}).
2. If delivery: call query_zones to show available zones → customer picks → call set_delivery_address with zone name + address.
3. Browse menu with query_menu, add items to cart.
4. When customer confirms, call submit_order with all info (orderType, deliveryAddress if delivery).
5. If customer asks about restaurant info (address, hours, payment), use check_restaurant_info.

Key rules:
- Extract items from conversation history.
- Use the EXACT item name as returned by query_menu (e.g. "مشويات مشكلة", "بيبسي").
- If customer says yes/ok/تمام to a non-confirmation question (like "want to see more?"), do NOT submit an order.
- If customer changes/removes/adds/hesitates/says not yet, keep unsubmitted.
- After successful submit, don't submit again until new order.
- if item has options, you MUST ask the customer which option they want before adding to cart.
- Before calling submit_order: ensure orderType is set. If delivery, ensure deliveryAddress is provided.

Extra context (use for natural conversation):
- If customer says "where are you?" → use check_restaurant_info(topic:address) [do NOT make up an address]
- If customer says "are you open?" → use check_restaurant_info(topic:hours)
- If customer says "what payments?" → use check_restaurant_info(topic:payment)
- If customer says "do you deliver?" → use check_restaurant_info(topic:delivery) or query_zones

Tools: query_menu, query_zones, check_restaurant_info, set_delivery_address, submit_order, check_order_status, file_complaint
`;

    systemPromptCache.set(cacheKey, {
      template,
      expires: Date.now() + CACHE_TTL_MS,
    });
  }

  const cartSection = `\n\nCurrent cart:\n${formatCartForPrompt(cartState, context.currency)}`;
  return template + cartSection;
}

export function sanitizeToolOutput(output: string): string {
  const cleaned = output.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const MAX_TOOL_OUTPUT_LENGTH = 4000;
  if (cleaned.length > MAX_TOOL_OUTPUT_LENGTH) {
    return cleaned.substring(0, MAX_TOOL_OUTPUT_LENGTH) + '\n[Output truncated]';
  }
  return cleaned;
}
