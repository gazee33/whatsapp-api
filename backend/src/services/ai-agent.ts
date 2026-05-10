import { prisma } from '../lib/prisma.js';
import { getMenuByBusiness } from '../services/menu.js';
import { getHistory, saveMessage, getOrCreateSession } from '../services/conversation.js';
import { createLLMProvider } from '../llm/factory.js';
import { tools } from '../tools/index.js';
import { ToolCall, ChatMessage } from '../llm/types.js';
import { handleQueryMenu } from '../tools/query-menu.js';
import { handleSubmitOrder } from '../tools/submit-order.js';
import { handleCheckStatus } from '../tools/check-status.js';
import { handleFileComplaint } from '../tools/file-complaint.js';
import { handleQueryZones } from '../tools/query-zones.js';
import { handleCheckRestaurantInfo } from '../tools/check-restaurant-info.js';
import { handleSetDeliveryAddress } from '../tools/set-delivery-address.js';
import { logDebugEntry } from './debug.js';
import { logError } from './error-log.js';
import { DebugStep } from '../debug/types.js';
import type { QueryMenuParams } from '../tools/query-menu.js';
import type { SubmitOrderParams } from '../tools/submit-order.js';
import type { CheckStatusParams } from '../tools/check-status.js';
import type { FileComplaintParams } from '../tools/file-complaint.js';
import type { QueryZonesParams } from '../tools/query-zones.js';
import type { CheckRestaurantInfoParams } from '../tools/check-restaurant-info.js';
import type { SetDeliveryAddressParams } from '../tools/set-delivery-address.js';
import type { LLMProvider } from '../llm/types.js';
import type { Business, Customer } from '@prisma/client';

const MAX_TOOL_ITERATIONS = 3;
const MAX_HISTORY_MESSAGES = 20;
const CACHE_TTL_MS = 600000; // 10 minutes

// System prompt cache: key = "businessId:language", value = cached template
const systemPromptCache = new Map<string, { template: string; expires: number }>();

type SupportedLanguage = 'ar' | 'en';
type AgentMode = 'browsing' | 'order_type_selection' | 'zone_selection' | 'address_entry' | 'cart_review' | 'awaiting_confirmation' | 'order_submitted';

interface CartItem {
  menuItemId?: string;
  name: string;
  nameAr?: string | null;
  quantity: number;
  unitPrice: number;
  optionName?: string;
  optionPrice?: number;
  notes?: string;
}

interface DeliveryInfo {
  zoneId: string;
  zoneName: string;
  address: string;
  notes?: string;
  fee: number;
  minimumOrder?: number;
  contactPhone?: string;
}

interface CartState {
  mode: AgentMode;
  items: CartItem[];
  orderType?: 'delivery' | 'dine_in' | 'pickup';
  deliveryInfo?: DeliveryInfo;
  lastAssistantAskedForConfirmation?: boolean;
  updatedAt: string;
}

interface ToolExecutionResult {
  result: string;
  cartState?: CartState;
  createdOrderId?: string;
}

function detectLanguage(text: string): SupportedLanguage {
  return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

function emptyCartState(): CartState {
  return {
    mode: 'browsing',
    items: [],
    lastAssistantAskedForConfirmation: false,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeToolArgs<T>(args: unknown): T {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args) as T;
    } catch (err) {
      console.error('[normalizeToolArgs] Failed to parse tool arguments:', args);
      throw new Error(`Invalid tool arguments format: ${(args as string).substring(0, 200)}`);
    }
  }
  return (args ?? {}) as T;
}

function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.unitPrice + (item.optionPrice || 0)) * item.quantity, 0);
}

function formatCartForPrompt(cart: CartState, currency: string): string {
  if (cart.items.length === 0) {
    return 'Cart is empty.';
  }

  const lines = cart.items.map((item, index) => {
    const itemPrice = item.unitPrice + (item.optionPrice || 0);
    const lineTotal = itemPrice * item.quantity;
    const optionStr = item.optionName ? ` (${item.optionName})` : '';
    return `${index + 1}. ${item.quantity}x ${item.name}${optionStr} - ${lineTotal} ${currency}${item.notes ? ` - Notes: ${item.notes}` : ''}`;
  });

  const sections: string[] = [lines.join('\n')];

  if (cart.deliveryInfo) {
    sections.push(
      `\nDelivery info:\n  Zone: ${cart.deliveryInfo.zoneName}\n  Address: ${cart.deliveryInfo.address}${cart.deliveryInfo.notes ? `\n  Notes: ${cart.deliveryInfo.notes}` : ''}${cart.deliveryInfo.contactPhone ? `\n  Contact: ${cart.deliveryInfo.contactPhone}` : ''}\n  Fee: ${cart.deliveryInfo.fee} ${currency}${cart.deliveryInfo.minimumOrder ? ` (min: ${cart.deliveryInfo.minimumOrder} ${currency})` : ''}`
    );
  }

  sections.push(`Total: ${calculateCartTotal(cart.items)} ${currency}`);
  sections.push(`Mode: ${cart.mode}`);
  if (cart.orderType) sections.push(`Order type: ${cart.orderType}`);
  sections.push(`Confirmation requested: ${cart.lastAssistantAskedForConfirmation ? 'yes' : 'no'}`);

  return sections.join('\n');
}

async function getCartState(customerId: string): Promise<CartState> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  if (!customer?.cartState) {
    return emptyCartState();
  }

  try {
    const parsed = JSON.parse(customer.cartState) as Partial<CartState>;
    return {
      mode: parsed.mode ?? 'browsing',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      orderType: parsed.orderType,
      deliveryInfo: parsed.deliveryInfo,
      lastAssistantAskedForConfirmation: Boolean(parsed.lastAssistantAskedForConfirmation),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyCartState();
  }
}

async function saveCartState(customerId: string, state: CartState): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      cartState: JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      }),
    },
  });
}

interface RestaurantContext {
  restaurantName: string;
  currency: string;
  openingTime: string;
  closingTime: string;
  aiRules: string;
  address: string | null;
  phoneNumber: string | null;
  deliveryEnabled: boolean;
  dineInEnabled: boolean;
  pickupEnabled: boolean;
  estimatedPrepTimeMinutes: number | null;
  paymentMethods: string[];
  isTemporarilyClosed: boolean;
}

async function getRestaurantContext(businessId: string): Promise<RestaurantContext> {
  const [settings, business] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { businessId } }),
    prisma.business.findUnique({ where: { id: businessId } }),
  ]);

  let paymentMethods: string[] = ['cash', 'card'];
  if (settings?.paymentMethods) {
    try {
      paymentMethods = JSON.parse(settings.paymentMethods);
    } catch {}
  }

  return {
    restaurantName: settings?.name || business?.name || 'the restaurant',
    currency: settings?.currency || 'SAR',
    openingTime: settings?.openingTime || '09:00',
    closingTime: settings?.closingTime || '23:00',
    aiRules: settings?.aiRules || '',
    address: settings?.address || null,
    phoneNumber: settings?.phoneNumber || null,
    deliveryEnabled: settings?.deliveryEnabled ?? false,
    dineInEnabled: settings?.dineInEnabled ?? true,
    pickupEnabled: settings?.pickupEnabled ?? true,
    estimatedPrepTimeMinutes: settings?.estimatedPrepTimeMinutes || null,
    paymentMethods,
    isTemporarilyClosed: settings?.isTemporarilyClosed ?? false,
  };
}

/**
 * Builds the system prompt with caching.
 * Caches the template portion (excluding cart) and injects cart at runtime.
 */
function buildSystemPrompt(params: {
  businessId: string;
  language: SupportedLanguage;
  cartState: CartState;
  context: Awaited<ReturnType<typeof getRestaurantContext>>;
}): string {
  const { businessId, language, cartState, context } = params;
  const cacheKey = `${businessId}:${language}`;

  // Check cache first
  const cached = systemPromptCache.get(cacheKey);
  let template: string;

  if (cached && cached.expires > Date.now()) {
    template = cached.template;
  } else {
    // Build compressed template
    const langInstr = language === 'ar'
      ? 'Respond only in Arabic, preferably Saudi casual Arabic.'
      : 'Respond only in English.';

    // Build order types string
    const orderTypes: string[] = [];
    if (context.deliveryEnabled) orderTypes.push('delivery');
    if (context.dineInEnabled) orderTypes.push('dine-in');
    if (context.pickupEnabled) orderTypes.push('pickup');
    const orderTypeStr = orderTypes.length > 0 ? `Order types: ${orderTypes.join(', ')}` : '';

    // Build location string
    const locationStr = context.address
      ? `📍 ${context.address}${context.phoneNumber ? ` ☎️ ${context.phoneNumber}` : ''}`
      : '';

    // Build payment string
    const paymentStr = `💳 ${context.paymentMethods.join(', ')}`;

    // Hours string
    const hoursStr = context.isTemporarilyClosed
      ? '🕐 TEMPORARILY CLOSED'
      : `🕐 ${context.openingTime}-${context.closingTime}`;

    // Prep time string
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

    // Cache the template
    systemPromptCache.set(cacheKey, {
      template,
      expires: Date.now() + CACHE_TTL_MS,
    });
  }

  // Inject current cart state
  const cartSection = `\n\nCurrent cart:\n${formatCartForPrompt(cartState, context.currency)}`;
  return template + cartSection;
}

function extractCreatedOrderId(toolResult: string): string | undefined {
  return toolResult.match(/Order #([a-f0-9-]+)/i)?.[1];
}

function shouldMarkConfirmationRequested(reply: string): boolean {
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

async function executeTool(params: {
  toolCall: ToolCall;
  businessId: string;
  customerId: string;
  cartState: CartState;
}): Promise<ToolExecutionResult> {
  const { toolCall, businessId, customerId, cartState } = params;

  switch (toolCall.name) {
    case 'query_menu': {
      const toolParams = normalizeToolArgs<QueryMenuParams>(toolCall.arguments);
      const result = await handleQueryMenu(businessId, toolParams);
      return { result };
    }

    case 'submit_order': {
      const toolParams = normalizeToolArgs<SubmitOrderParams>(toolCall.arguments);

      if (toolParams && typeof (toolParams as any).items === 'string') {
        try {
          (toolParams as any).items = JSON.parse((toolParams as any).items);
        } catch {
          console.error('[executeTool] items field is not valid JSON:', (toolParams as any).items);
          return { result: 'The order items data was malformed. Please try again with valid item names and quantities.' };
        }
      }

      const result = await handleSubmitOrder(businessId, customerId, toolParams);
      const createdOrderId = extractCreatedOrderId(result);

      return {
        result,
        createdOrderId,
        cartState: createdOrderId ? emptyCartState() : cartState,
      };
    }

    case 'check_order_status': {
      const toolParams = normalizeToolArgs<CheckStatusParams>(toolCall.arguments);
      const result = await handleCheckStatus(businessId, customerId, toolParams);
      return { result };
    }

    case 'file_complaint': {
      const toolParams = normalizeToolArgs<FileComplaintParams>(toolCall.arguments);
      const result = await handleFileComplaint(businessId, customerId, toolParams);
      return { result };
    }

    case 'query_zones': {
      const toolParams = normalizeToolArgs<QueryZonesParams>(toolCall.arguments);
      const result = await handleQueryZones(businessId, toolParams);
      return { result };
    }

    case 'check_restaurant_info': {
      const toolParams = normalizeToolArgs<CheckRestaurantInfoParams>(toolCall.arguments);
      const result = await handleCheckRestaurantInfo(businessId, toolParams);
      return { result };
    }

    case 'set_delivery_address': {
      const toolParams = normalizeToolArgs<SetDeliveryAddressParams>(toolCall.arguments);
      const result = await handleSetDeliveryAddress(businessId, customerId, toolParams);
      return { result };
    }

    default:
      return { result: `Unknown tool: ${toolCall.name}` };
  }
}

export async function processMessage(
  business: Business,
  customer: Customer,
  text: string
): Promise<string> {
  const llmProvider = createLLMProvider();
  const agent = new AIAgentService(llmProvider, business.id);

  const result = await agent.processMessage({
    customerId: customer.id,
    message: text,
  });

  return result.reply;
}

export class AIAgentService {
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly businessId: string
  ) {}

  async processMessage(params: {
    customerId: string;
    message: string;
  }): Promise<{
    reply: string;
    orderId?: string;
  }> {
    const { customerId, message } = params;
    const sessionId = await getOrCreateSession(customerId);
    const language = detectLanguage(message);

    // Phase 1: Run independent queries in parallel
    let [cartState, history, context] = await Promise.all([
      getCartState(customerId),
      getHistory(customerId, sessionId),
      getRestaurantContext(this.businessId),
    ]);

    let createdOrderId: string | undefined;

    await logDebugEntry(customerId, sessionId, DebugStep.Decision, {
      timestamp: new Date().toISOString(),
      decision: {
        type: 'message_received',
        details: {
          language,
          cartMode: cartState.mode,
          cartItemsCount: cartState.items.length,
          message
        },
      },
    });

    const historyMessages = history.slice(-MAX_HISTORY_MESSAGES);
    const systemPrompt = buildSystemPrompt({
      businessId: this.businessId,
      language,
      cartState,
      context,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const promptStartTime = Date.now();
    await logDebugEntry(
      customerId,
      sessionId,
      DebugStep.Prompt,
      {
        timestamp: new Date().toISOString(),
        prompt: {
          system: systemPrompt,
          messages: messages.slice(1) as Array<{ role: string; content: string }>,
        },
      },
      Date.now() - promptStartTime
    );

    let finalResponse = 'I apologize, but I could not process your request at this time.';

    for (let iteration = 1; iteration <= MAX_TOOL_ITERATIONS; iteration++) {
      let llmResponse;
      const llmCallStartTime = Date.now();

      try {
        llmResponse = await this.llmProvider.chat(messages, tools);
      } catch (llmError: any) {
        console.error('[AI-Agent] LLM call failed:', llmError);
        await logError({
          businessId: this.businessId,
          customerId,
          sessionId,
          errorType: llmError?.constructor?.name || 'LLMError',
          errorMessage: llmError?.message || 'LLM call failed',
          errorStack: llmError?.stack,
          context: {
            iteration,
            message: message.substring(0, 100),
          },
        });
        throw llmError; // Re-throw to be caught by webhook.ts
      }

      finalResponse = llmResponse.content || finalResponse;

      await logDebugEntry(
        customerId,
        sessionId,
        DebugStep.Response,
        {
          timestamp: new Date().toISOString(),
          response: {
            iteration,
            fullResponse: llmResponse,
            toolCalls: llmResponse.toolCalls?.map((tc) => ({
              name: tc.name,
              args: tc.arguments,
            })),
          },
        },
        Date.now() - llmCallStartTime
      );

      if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
        break;
      }

      messages.push({
        role: 'assistant',
        content: llmResponse.content || '',
        toolCalls: llmResponse.toolCalls,
        reasoningContent: llmResponse.reasoningContent,
      } as any);

      for (const toolCall of llmResponse.toolCalls) {
        await logDebugEntry(customerId, sessionId, DebugStep.ToolCall, {
          timestamp: new Date().toISOString(),
          toolCall: {
            iteration,
            name: toolCall.name,
            args: toolCall.arguments,
          },
        });

        const toolStartTime = Date.now();
        let execution: ToolExecutionResult;
        try {
          execution = await executeTool({
            toolCall,
            businessId: this.businessId,
            customerId,
            cartState,
          });
        } catch (toolError: any) {
          console.error(`[AI-Agent] Tool ${toolCall.name} threw exception:`, toolError);
          await logError({
            businessId: this.businessId,
            customerId,
            sessionId,
            errorType: toolError?.constructor?.name || 'ToolExecutionError',
            errorMessage: toolError?.message || `Tool ${toolCall.name} failed`,
            errorStack: toolError?.stack,
            context: {
              iteration,
              toolName: toolCall.name,
              toolArgs: toolCall.arguments,
              originalMessage: message,
            },
          });
          execution = {
            result: 'The tool encountered an error. Please try again or rephrase your request.',
          };
        }

        if (execution.cartState) {
          cartState = execution.cartState;
          await saveCartState(customerId, cartState);
        }

        if (execution.createdOrderId) {
          createdOrderId = execution.createdOrderId;
        }

        await logDebugEntry(
          customerId,
          sessionId,
          DebugStep.ToolResult,
          {
            timestamp: new Date().toISOString(),
            toolResult: {
              iteration,
              name: toolCall.name,
              result: execution.result.substring(0, 1000),
            },
          },
          Date.now() - toolStartTime
        );

        // Log to error log if tool returned an error indicator
        const isErrorResult = execution.result.toLowerCase().includes('error') ||
                             execution.result.toLowerCase().includes('could not') ||
                             execution.result.toLowerCase().includes('failed') ||
                             execution.result.toLowerCase().includes('no items provided') ||
                             execution.result.toLowerCase().includes('no valid items') ||
                              execution.result.toLowerCase().includes('does not have options') ||
                              execution.result.toLowerCase().includes('please specify an option') ||
                             execution.result.toLowerCase().includes('malformed') ||
                             execution.result.toLowerCase().includes('unknown tool') ||
                             execution.result.includes('لا يوجد') ||
                             execution.result.includes('غير متوفر') ||
                             execution.result.includes('عذراً') ||
                             execution.result.includes('خطأ');

        if (isErrorResult) {
          console.error(`[AI-Agent] Tool ${toolCall.name} returned error result: ${execution.result.substring(0, 200)}`);
          await logError({
            businessId: this.businessId,
            customerId,
            sessionId,
            errorType: 'ToolExecutionError',
            errorMessage: `Tool ${toolCall.name} returned: ${execution.result.substring(0, 500)}`,
            context: {
              iteration,
              toolName: toolCall.name,
              toolArgs: toolCall.arguments,
              originalMessage: message,
            },
          });
        }

        messages.push({
          role: 'tool' as any,
          content: execution.result,
          toolCallId: toolCall.id,
        });
      }
    }

    if (cartState.items.length > 0) {
      cartState = {
        ...cartState,
        mode: shouldMarkConfirmationRequested(finalResponse) ? 'awaiting_confirmation' : cartState.mode,
        lastAssistantAskedForConfirmation: shouldMarkConfirmationRequested(finalResponse),
        updatedAt: new Date().toISOString(),
      };
      await saveCartState(customerId, cartState);
    }

    await saveMessage(customerId, sessionId, 'user', message);
    await saveMessage(customerId, sessionId, 'assistant', finalResponse);

    return {
      reply: finalResponse,
      orderId: createdOrderId,
    };
  }
}
