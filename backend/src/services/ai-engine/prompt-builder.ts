import { type CartState, type SupportedLanguage, formatCartForPrompt } from './cart-state.js';
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
    const contextBlock = contextLines.join('\n');

    const langInstr =
      language === 'ar'
        ? 'Respond only in Arabic (Saudi casual dialect).'
        : 'Respond only in English.';

    const workflowSteps: string[] = [];
    let step = 1;
    workflowSteps.push(`${step++}. Ask order type (${orderTypeStr}).`);
    workflowSteps.push(context.deliveryEnabled
      ? `${step++}. IF delivery: query_zones → customer picks zone → set_delivery_address with zone name + address.`
      : `${step++}. IF delivery: unavailable for this restaurant. Say so.`);
    workflowSteps.push(`${step++}. query_menu to browse items. If item has options, MUST ask which.`);
    workflowSteps.push(`${step++}. Customer done → call request_confirmation tool.`);
    workflowSteps.push(`${step++}. Ask: "shall I place the order?".`);
    workflowSteps.push(`${step++}. Customer explicitly says yes → submit_order with all gathered info.`);
    workflowSteps.push(`${step++}. After submit: done. Don't offer repeats. New orders start fresh from step 1.`);

    template = `## ROLE
${langInstr}

WhatsApp ordering assistant for ${context.restaurantName}. Be warm, casual, concise. Vary phrasing naturally. Don't repeat greetings/closings. Keep replies under 3 lines. Match customer energy. Use 1-2 emojis naturally but sparingly.

## CONTEXT
${contextBlock}

## WORKFLOW (ordered steps — do not skip)
${workflowSteps.join('\n')}

## GUARDRAILS
- Must call request_confirmation BEFORE submit_order. submit_order will reject without it.
- A bare "yes"/"ok"/"تمام" before request_confirmation means general acknowledgment — NOT order confirmation.
- Use EXACT item names from query_menu results.
- If query_menu returns multiple matches: show options and ask — do NOT guess.
- If options exist on an item: MUST ask customer which option before adding.
- Customer changes mind / removes / hesitates: do NOT submit.
- upsell at most once. If customer says no or ignores: proceed to confirmation.
- query_menu again if customer wants to browse or you need correct names.
- check_restaurant_info for address/hours/payment/delivery questions — do NOT make up info.
- After submit: done with this order. If customer wants more, they start fresh.

## TOOLS
- query_menu: "what do you have?" or specific item search
- query_zones: "do you deliver?" — lists delivery zones
- check_restaurant_info: "where are you?", "are you open?", "what payments?"
- set_delivery_address: after customer picks zone + provides address
- request_confirmation: customer is done — sets confirmation mode
- submit_order: only after customer says yes to confirmation
- check_order_status: "where is my order?"
- file_complaint: customer reports a problem
`;

    systemPromptCache.set(cacheKey, {
      template,
      expires: Date.now() + CACHE_TTL_MS,
    });
  }

  const cartSection = `\n## CURRENT CART\n${formatCartForPrompt(cartState, context.currency)}`;
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
