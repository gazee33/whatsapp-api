import { type CartState, type SupportedLanguage, formatCartForPrompt, calculateCartTotal } from './cart-state.js';
import type { RestaurantContext, MenuItemInfo } from './restaurant-context.js';
import { getPlatformConfig } from '../../services/platform-config.js';

const CACHE_TTL_MS = 600000; // 10 minutes
const systemPromptCache = new Map<string, { template: string; expires: number }>();

export function clearSystemPromptCache(): void {
  systemPromptCache.clear();
}

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

function formatMenuForPrompt(items: MenuItemInfo[], currency: string): string {
  if (items.length === 0) return '';

  const grouped = new Map<string, { nameAr: string | null; items: MenuItemInfo[] }>();
  for (const item of items) {
    const key = item.categoryName;
    if (!grouped.has(key)) {
      grouped.set(key, { nameAr: item.categoryNameAr, items: [] });
    }
    grouped.get(key)!.items.push(item);
  }

  const lines: string[] = [];
  for (const [catName, group] of grouped) {
    const header = group.nameAr ? `### ${catName} / ${group.nameAr}` : `### ${catName}`;
    lines.push(`\n${header}`);
    for (const item of group.items) {
      const price = (item.basePrice ?? 0).toFixed(2);
      const nameDisplay = item.nameAr ? `${item.name} (${item.nameAr})` : item.name;
      lines.push(`- [${item.id}] ${nameDisplay} | ${price} ${currency}${item.description ? ` | ${item.description}` : ''}`);
      if (item.options.length > 0) {
        const opts = item.options.map(opt => {
          const priceStr = opt.price > 0 ? `+${opt.price.toFixed(2)}` : '0.00';
          return `${opt.id}=${opt.name}(${priceStr})`;
        }).join(', ');
        lines.push(`  Options: ${opts}`);
      }
    }
  }

  return lines.join('\n');
}

function getGuardrailsBlock(): string {
  return `- Only call submit_order when the customer clearly confirms they want to place the order. If they mention changes, additions, or hesitations — keep the cart open and continue.
- Use item IDs AND option IDs from FULL MENU section EXACTLY — do NOT guess or make up items.
- If options exist on an item: MUST ask customer which option, then pass optionId in add_to_cart.
- Customer changes mind / removes / hesitates: do NOT submit.
- upsell at most once. If customer says no or ignores: proceed to confirmation.
- check_restaurant_info for address/hours/payment/delivery questions — do NOT make up info.
- After submit: done with this order. If customer wants more, they start fresh.
- ESCALATION: If the customer is angry, frustrated, insulting, asks to speak to a human/manager, asking questions that are not related to the menu or the order more than 3 times, or the issue is beyond what the available tools can resolve — call flag_customer to escalate to human support. Once flagged, tell the customer a support agent will follow up shortly and stop trying to resolve the issue yourself.`;
}

function getToolsBlock(): string {
  return `- add_to_cart: add selected items to cart (bulk — pass all items at once). Use optionId from query_menu.
- update_cart: modify a cart item at a specific [index]. Pass FULL updated values.
- check_restaurant_info: "where are you?", "are you open?", "what payments?", "how much is delivery?"
- set_delivery_address: save delivery location + calculate fee
- submit_order: create order — items auto-filled from cart. Only call after customer says yes.
- check_order_status: "where is my order?"
- file_complaint: customer reports a problem
- flag_customer: escalate to human support — use when customer is angry/frustrated, asks for a human, or the issue is too complex. Provide a clear reason.
- send_interactive_list: send a list with multiple options. USE WHEN presenting choices like: delivery zones with fees, menu categories, order type options, product variants. Creates a scrollable list UI — much better than text for options.
- send_interactive_button: send buttons for YES/NO or binary choices (2-3 options max). USE WHEN asking confirmations, simple yes/no questions.
- send_template_message: send a pre-approved template. USE FOR order confirmations, status updates that need branding.`;
}

function getInteractiveBlock(): string {
  return `These rules are MANDATORY — not suggestions. The bodyText parameter of interactive messages IS the message the customer sees — your greeting, context, and choice prompt all go there. Write your full warm message in bodyText. Supports 1024 characters with formatting (*bold*, _italic_, emojis).

### When you call send_interactive_list or send_interactive_button:
- The bodyText you provide IS your message to the customer. Put everything there.
- You can still write a brief text alongside but it will NOT be sent (system detects interactive messages and sends only the interactive).

### You MUST call send_interactive_button when:
- Asking the customer to confirm an order or action
- Any yes/no or binary choice (max 3 buttons)
- BAD (will be penalized): "تأكد خلاص؟" ← plain text confirmation
- GOOD: send_interactive_button with buttons=["تأكيد الطلب", "تعديل"]

### Technical limits:
- Interactive lists: max 10 rows total across all sections. Exceeding this triggers auto-fallback to text (the tool will tell you).
- Interactive buttons: max 3 buttons only.
- When customer replies to interactive messages, WhatsApp sends the button/list row ID as text (e.g., "[BUTTON: confirm]" or "[LIST: zone_1]"). Treat these as regular customer responses.`;
}

function getRoleDescription(restaurantName: string): string {
  return `WhatsApp ordering assistant for ${restaurantName}. Be warm, casual, concise. Vary phrasing naturally. Don't repeat greetings/closings. Keep replies under 3 lines when using plain text. For interactive messages, write your full warm message in bodyText (supports 1024 chars with formatting, emojis). Match customer energy. Use 1-2 emojis naturally but sparingly. do not repeatly use laughing emoji.`;
}

function replacePlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function buildTemplateSections(params: {
  language: SupportedLanguage;
  context: RestaurantContext;
}): {
  languageInstruction: string;
  contextBlock: string;
  menuBlock: string;
  workflowBlock: string;
  orderTypeStr: string;
} {
  const { language, context } = params;

  const orderTypes: string[] = [];
  if (context.deliveryEnabled) orderTypes.push('delivery');
  if (context.dineInEnabled) orderTypes.push('dine-in');
  if (context.pickupEnabled) orderTypes.push('pickup');
  const orderTypeStr = orderTypes.join(', ');

  const contextLines: string[] = [
    `${context.restaurantName} | ${context.isTemporarilyClosed ? 'CLOSED' : `${context.openingTime}-${context.closingTime}`} | ${context.currency}`,
  ];

  if (context.isTemporarilyClosed) {
    contextLines.push('🕐 Status: TEMPORARILY CLOSED');
  } else if (context.isCurrentlyOpen) {
    contextLines.push(`🕐 Status: OPEN NOW (current time: ${context.currentTime})`);
  } else {
    contextLines.push(`🕐 Status: CLOSED NOW (current time: ${context.currentTime})`);
  }

  contextLines.push(`Payment: ${context.paymentMethods.join(', ')}`);
  if (orderTypes.length > 0) contextLines.push(`Types: ${orderTypeStr}`);
  if (context.estimatedPrepTimeMinutes) contextLines.push(`Prep: ~${context.estimatedPrepTimeMinutes} min`);
  if (context.deliveryEnabled) {
    contextLines.push(formatDeliveryTiers(context));
  }
  const contextBlock = contextLines.join('\n');

  const languageInstruction =
    language === 'ar'
      ? 'Respond only in Arabic (Saudi casual dialect).'
      : 'Respond only in English.';

  const workflowSteps: string[] = [];
  let step = 1;
  workflowSteps.push(`${step++}. IF order type not set yet: ask customer (${orderTypeStr}).`);
  workflowSteps.push(context.deliveryEnabled
    ? `${step++}. IF delivery AND no address set yet: ask customer to share location or type address. When location is shared, you'll receive [Location shared: lat,lng]. Call set_delivery_address with coordinates. When address is typed, call set_delivery_address with the address text.`
    : `${step++}. IF delivery: unavailable for this restaurant. Say so.`);
  workflowSteps.push(`${step++}. Use the FULL MENU section to browse items. When customer picks items, use add_to_cart.`);
  workflowSteps.push(`${step++}. If customer wants to change quantity/option/notes of an existing item, use update_cart with the 0-based [index] from CURRENT CART.`);
  workflowSteps.push(`${step++}. Customer done → ask: "shall I place the order?". Review cart items with customer.`);
  workflowSteps.push(`${step++}. Customer explicitly says yes → call submit_order. Items, orderType, address and phone are auto-filled from cart state.`);
  workflowSteps.push(`${step++}. After submit: done. Don't offer repeats. New orders start fresh from step 1.`);

  const menuBlock = formatMenuForPrompt(context.menuItems, context.currency);

  return {
    languageInstruction,
    contextBlock,
    menuBlock,
    workflowBlock: workflowSteps.join('\n'),
    orderTypeStr,
  };
}

function buildHardcodedTemplate(sections: ReturnType<typeof buildTemplateSections>, context: RestaurantContext): string {
  return `## ROLE
${sections.languageInstruction}

${getRoleDescription(context.restaurantName)}

## CONTEXT
${sections.contextBlock}

## FULL MENU (use exact IDs from this section — do NOT guess or make up items)
${sections.menuBlock}

## WORKFLOW (only do steps not yet completed)
${sections.workflowBlock}

## GUARDRAILS
${getGuardrailsBlock()}

## TOOLS
${getToolsBlock()}

## INTERACTIVE MESSAGES (MANDATORY RULES)
${getInteractiveBlock()}`;
}

function buildPlatformPromptTemplate(
  platformTemplate: string,
  sections: ReturnType<typeof buildTemplateSections>,
  context: RestaurantContext,
): string {
  const parsed = JSON.parse(platformTemplate);
  const template = parsed.template as string;

  return replacePlaceholders(template, {
    languageInstruction: sections.languageInstruction,
    restaurantName: context.restaurantName,
    contextBlock: sections.contextBlock,
    menuBlock: sections.menuBlock,
    workflowBlock: sections.workflowBlock,
    guardrailsBlock: getGuardrailsBlock(),
    toolsBlock: getToolsBlock(),
    interactiveBlock: getInteractiveBlock(),
    roleDescription: getRoleDescription(context.restaurantName),
  });
}

export async function buildSystemPrompt(params: {
  businessId: string;
  language: SupportedLanguage;
  cartState: CartState;
  context: RestaurantContext;
  customerName?: string;
  customerPhone?: string;
}): Promise<string> {
  const { businessId, language, cartState, context, customerName, customerPhone } = params;

  const sections = buildTemplateSections({ language, context });

  const platformConfig = await getPlatformConfig();

  const cacheKey = `${businessId}:${language}:${platformConfig.promptVersion}`;

  const cached = systemPromptCache.get(cacheKey);
  let template: string;

  if (cached && cached.expires > Date.now()) {
    template = cached.template;
  } else {
    if (platformConfig.promptTemplate) {
      try {
        template = buildPlatformPromptTemplate(platformConfig.promptTemplate, sections, context);
      } catch {
        template = buildHardcodedTemplate(sections, context);
      }
    } else {
      template = buildHardcodedTemplate(sections, context);
    }

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
