import { prisma } from '../../lib/prisma.js';
import { getHistory, saveMessage, getOrCreateSession } from '../conversation.js';
import { tools } from '../../tools/index.js';
import type { ChatMessage, LLMProvider } from '../../llm/types.js';
import type { Business, Customer } from '@prisma/client';
import { logDebugEntry } from '../debug.js';
import { logError } from '../error-log.js';
import { DebugStep } from '../../debug/types.js';
import { getCartState, saveCartState } from './cart-state.js';
import type { CartState } from './cart-state.js';
import { getRestaurantContext } from './restaurant-context.js';
import type { RestaurantContext } from './restaurant-context.js';
import { detectLanguage, buildSystemPrompt, shouldMarkConfirmationRequested } from './prompt-builder.js';
import type { SupportedLanguage } from './prompt-builder.js';
import { executeTool } from './tool-executor.js';
import type { ToolExecutionResult } from './tool-executor.js';

const MAX_TOOL_ITERATIONS = 3;
const MAX_HISTORY_MESSAGES = 20;

export class AIAgentService {
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly businessId: string,
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
          message,
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
      Date.now() - promptStartTime,
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
          Date.now() - toolStartTime,
        );

        const isErrorResult =
          execution.result.toLowerCase().includes('error') ||
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
          console.error(
            `[AI-Agent] Tool ${toolCall.name} returned error result: ${execution.result.substring(0, 200)}`,
          );
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
