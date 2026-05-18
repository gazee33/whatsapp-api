import { prisma } from '../../lib/prisma.js';
import { getHistory, saveMessage, getOrCreateSession } from '../conversation.js';
import { tools as allTools } from '../../tools/index.js';
import type { ChatMessage, LLMProvider } from '../../llm/types.js';
import type { ToolDefinition } from '../../llm/types.js';
import type { Business, Customer } from '@prisma/client';
import { logDebugEntry } from '../debug.js';
import { logError } from '../error-log.js';
import { DebugStep } from '../../debug/types.js';
import { getCartState, saveCartState, formatCartForPrompt } from './cart-state.js';
import type { CartState } from './cart-state.js';
import { getRestaurantContext } from './restaurant-context.js';
import type { RestaurantContext } from './restaurant-context.js';
import { detectLanguage, buildSystemPrompt, sanitizeToolOutput } from './prompt-builder.js';
import type { SupportedLanguage } from './cart-state.js';
import { executeTool } from './tool-executor.js';
import type { ToolExecutionResult } from './tool-executor.js';
import { getPlatformConfig } from '../platform-config.js';

const DEFAULT_MAX_TOOL_ITERATIONS = 6;

const FEATURE_FLAG_TOOLS: Record<string, string> = {
  interactiveListMessagesEnabled: 'send_interactive_list',
  interactiveButtonsMessagesEnabled: 'send_interactive_button',
  complaintToolEnabled: 'file_complaint',
  orderStatusToolEnabled: 'check_order_status',
  flagCustomerToolEnabled: 'flag_customer',
};

function filterToolsByFeatureFlags(
  tools: ToolDefinition[],
  config: { [key: string]: any },
): ToolDefinition[] {
  return tools.filter(tool => {
    for (const [flag, toolName] of Object.entries(FEATURE_FLAG_TOOLS)) {
      if (tool.name === toolName && config[flag] === false) {
        return false;
      }
    }
    return true;
  });
}
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_TOKENS = 3000;
const TOOL_TIMEOUT_MS = 15000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function trimHistoryToBudget<T extends { content: string }>(
  messages: T[],
  maxTokens: number,
  maxMessages: number,
): T[] {
  let total = 0;
  const result: T[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (result.length >= maxMessages) break;
    const tokens = estimateTokens(messages[i].content) + 4;
    if (total + tokens > maxTokens) break;
    total += tokens;
    result.unshift(messages[i]);
  }
  return result;
}

function makeToolCallFingerprint(name: string, args: Record<string, any>): string {
  const keys = Object.keys(args || {}).sort();
  return `${name}:${JSON.stringify(args, keys)}`;
}

export class AIAgentService {
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly businessId: string,
  ) {}

  async processMessage(params: {
    customerId: string;
    message: string;
    customerName?: string;
    customerPhone?: string;
    locationData?: { latitude: number; longitude: number; name?: string; address?: string };
  }): Promise<{
    reply: string;
    orderId?: string;
    didSendMessage?: boolean;
  }> {
    const { customerId, message, customerName, customerPhone, locationData } = params;

    const MAX_MESSAGE_LENGTH = 4000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return {
        reply: 'Message too long. Please send a shorter message.',
      };
    }

    const { sessionId, isNew: isNewSession } = await getOrCreateSession(customerId);

    let [cartState, history, context, platformConfig] = await Promise.all([
      getCartState(customerId),
      getHistory(customerId, sessionId),
      getRestaurantContext(this.businessId),
      getPlatformConfig(),
    ]);

    const tools = filterToolsByFeatureFlags(allTools, platformConfig);
    const maxToolIterations = platformConfig.maxToolIterations || DEFAULT_MAX_TOOL_ITERATIONS;

    // On a fresh session (>30 min gap) reset conversational state so stale orderType/
    // deliveryLocation from a previous session don't bleed into the new conversation.
    if (isNewSession) {
      cartState = {
        ...cartState,
        mode: 'browsing',
        orderType: undefined,
        deliveryLocation: undefined,
      };
      await saveCartState(customerId, cartState);
    }

    if (!cartState.language) {
      const seedLanguage = (context.defaultLanguage === 'ar' ? 'ar' : 'en') as SupportedLanguage;
      const detected = detectLanguage(message);
      cartState = { ...cartState, language: detected ?? seedLanguage };
      await saveCartState(customerId, cartState);
    }
    const language = cartState.language ?? (context.defaultLanguage === 'ar' ? 'ar' : 'en') as SupportedLanguage;

    let createdOrderId: string | undefined;
    let didSendMessage = false;

    await logDebugEntry(customerId, sessionId, DebugStep.Decision, {
      timestamp: new Date().toISOString(),
      decision: {
        type: 'message_received',
        details: {
          language,
          cartMode: cartState.mode,
          cartItemsCount: cartState.items.length,
          message,
        },
      },
    });

    const historyMessages = trimHistoryToBudget(history, MAX_HISTORY_TOKENS, MAX_HISTORY_MESSAGES);
    const systemPrompt = await buildSystemPrompt({
      businessId: this.businessId,
      language,
      cartState,
      context,
      customerName,
      customerPhone,
    });

    const userContent = locationData
      ? `[Location shared: ${locationData.latitude},${locationData.longitude}${locationData.name ? ` — ${locationData.name}` : ''}${locationData.address ? ` (${locationData.address})` : ''}]\n${message}`
      : message;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userContent },
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
      Date.now() - promptStartTime,
    );

    let finalResponse = language === 'ar'
      ? 'عذراً، حصل خلل بسيط. جرّب مرة ثانية 🙏'
      : 'Sorry, I hit a snag. Please try again in a moment.';

    const toolCallFingerprints = new Set<string>();

    interface ToolMetricsEntry {
      name: string;
      durationMs: number;
      success: boolean;
      errorCode?: string;
      repeated: boolean;
    }
    const toolMetrics: ToolMetricsEntry[] = [];

    let iterationsUsed = 0;

    for (let iteration = 1; iteration <= maxToolIterations; iteration++) {
      iterationsUsed = iteration;
      let llmResponse;
      const llmCallStartTime = Date.now();

      try {
        llmResponse = await this.llmProvider.chat(messages, tools);
      } catch (llmError: any) {
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
        throw llmError;
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
        Date.now() - llmCallStartTime,
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
        const fingerprint = makeToolCallFingerprint(toolCall.name, toolCall.arguments);
        const isRepeated = toolCallFingerprints.has(fingerprint);
        toolCallFingerprints.add(fingerprint);

        await logDebugEntry(customerId, sessionId, DebugStep.ToolCall, {
          timestamp: new Date().toISOString(),
          toolCall: {
            iteration,
            name: toolCall.name,
            args: toolCall.arguments,
          },
        });

        if (isRepeated) {
          await logDebugEntry(customerId, sessionId, DebugStep.Decision, {
            timestamp: new Date().toISOString(),
            decision: {
              type: 'repeated_tool_skipped',
              details: { name: toolCall.name, fingerprint, iteration },
            },
          });
          messages.push({
            role: 'tool' as any,
            content: `Tool ${toolCall.name} already called with identical arguments. Please try a different approach or different parameters.`,
            toolCallId: toolCall.id,
          });
          toolMetrics.push({
            name: toolCall.name,
            durationMs: 0,
            success: false,
            errorCode: 'REPEATED_CALL',
            repeated: true,
          });
          continue;
        }

        const toolStartTime = Date.now();
        let execution: ToolExecutionResult;
        const toolPromise = executeTool({
          toolCall,
          businessId: this.businessId,
          customerId,
          cartState,
          customerPhone,
        });
        let timeoutHandle: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Tool ${toolCall.name} timed out after ${TOOL_TIMEOUT_MS}ms`)),
            TOOL_TIMEOUT_MS,
          );
        });
        try {
          execution = await Promise.race([toolPromise, timeoutPromise]);
        } catch (toolError: any) {
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
            success: false,
            result: 'The tool encountered an error. Please try again or rephrase your request.',
            errorCode: 'TOOL_CRASHED',
          };
        } finally {
          clearTimeout(timeoutHandle!);
          toolPromise.catch(() => {}); // Prevent unhandled rejection from the racing tool promise
        }

        const toolDuration = Date.now() - toolStartTime;
        toolMetrics.push({
          name: toolCall.name,
          durationMs: toolDuration,
          success: execution.success,
          errorCode: execution.errorCode,
          repeated: false,
        });

        if (execution.cartState) {
          cartState = execution.cartState;
          await saveCartState(customerId, cartState);
        }

        // Always refresh CURRENT CART in the system prompt after any tool call.
        // This prevents the LLM from displaying hallucinated cart contents when
        // a previous add_to_cart failed silently (e.g. missing optionId).
        const newCartSection = `\n## CURRENT CART\n${formatCartForPrompt(cartState, context.currency)}`;
        const systemMsg = messages[0];
        if (systemMsg && typeof systemMsg.content === 'string') {
          systemMsg.content = systemMsg.content.replace(/## CURRENT CART[\s\S]*$/, newCartSection);
        }

        if (execution.createdOrderId) {
          createdOrderId = execution.createdOrderId;
        }

        if (execution.success && ['send_interactive_list', 'send_interactive_button', 'send_template_message'].includes(toolCall.name)) {
          didSendMessage = true;
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
          toolDuration,
        );

        if (!execution.success) {
          await logError({
            businessId: this.businessId,
            customerId,
            sessionId,
            errorType: 'ToolExecutionError',
            errorMessage: `Tool ${toolCall.name} returned error [${execution.errorCode || 'UNKNOWN'}]: ${execution.result.substring(0, 500)}`,
            context: {
              iteration,
              toolName: toolCall.name,
              toolArgs: toolCall.arguments,
              originalMessage: message,
              errorCode: execution.errorCode,
            },
          });
        }

        const sanitizedContent = sanitizeToolOutput(execution.result);

        messages.push({
          role: 'tool' as any,
          content: sanitizedContent,
          toolCallId: toolCall.id,
        });
      }
    }

    if (toolMetrics.length > 0) {
      const failures = toolMetrics.filter(m => !m.success);
      const repeatedTotal = toolMetrics.filter(m => m.repeated).length;
      const totalDuration = toolMetrics.reduce((sum, m) => sum + m.durationMs, 0);
      const avgLatency = Math.round(totalDuration / toolMetrics.length);

      if (failures.length > 0) {
        console.warn(`[Metrics] Tool failures: ${failures.map(m => `${m.name}(${m.errorCode || '?'})`).join(', ')}`);
      }
      if (repeatedTotal > 0) {
        console.warn(`[Metrics] Repeated tool calls detected: ${repeatedTotal}`);
      }
      if (iterationsUsed >= maxToolIterations) {
        console.warn(`[Metrics] Iteration budget exhausted (${maxToolIterations}) after ${toolMetrics.length} tool calls`);
      }
      console.log(`[Metrics] Tools: ${toolMetrics.length} calls, ${totalDuration}ms total, ${avgLatency}ms avg, ${failures.length} failures, ${repeatedTotal} repeated`);
    }

    if (cartState.items.length > 0) {
      cartState = {
        ...cartState,
        updatedAt: new Date().toISOString(),
      };
      await saveCartState(customerId, cartState);
    }

    await saveMessage(customerId, sessionId, 'user', message);
    await saveMessage(customerId, sessionId, 'assistant', finalResponse);

    return {
      reply: finalResponse,
      orderId: createdOrderId,
      didSendMessage,
    };
  }
}
