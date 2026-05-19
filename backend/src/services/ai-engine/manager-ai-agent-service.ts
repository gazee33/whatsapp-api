import type { LLMProvider, ChatMessage } from '../../llm/types.js';
import type { Manager } from '@prisma/client';
import { getManagerHistory, saveManagerMessage, getOrCreateManagerSession } from '../manager-conversation.js';
import { buildManagerSystemPrompt, sanitizeToolOutput } from './prompt-builder.js';
import { MANAGER_TOOL_DEFINITIONS, executeManagerTool } from '../../tools/manager/index.js';
import type { BusinessWithSettings, ManagerToolContext } from '../../tools/manager/index.js';
import { getPlatformConfig } from '../platform-config.js';

const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_TOKENS = 3000;
const TOOL_TIMEOUT_MS = 15000;
const DEFAULT_MAX_TOOL_ITERATIONS = 6;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function trimHistoryToBudget(
  messages: { role: string; content: string }[],
  maxTokens: number,
  maxMessages: number,
): { role: string; content: string }[] {
  let total = 0;
  const result: { role: string; content: string }[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (result.length >= maxMessages) break;
    const tokens = estimateTokens(messages[i].content) + 4;
    if (total + tokens > maxTokens) break;
    total += tokens;
    result.unshift(messages[i]);
  }
  return result;
}

export interface ManagerAgentServiceResult {
  reply: string;
  didSendMessage?: boolean;
}

export class ManagerAIAgentService {
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly businessId: string,
  ) {}

  async processMessage(params: {
    managerId: string;
    managerPhone: string;
    message: string;
    business: BusinessWithSettings;
    manager: Manager;
  }): Promise<ManagerAgentServiceResult> {
    const { managerId, managerPhone, message, business, manager } = params;

    const MAX_MESSAGE_LENGTH = 4000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return { reply: 'Message too long. Please send a shorter message.' };
    }

    const { sessionId } = await getOrCreateManagerSession(managerId);
    const [history, platformConfig] = await Promise.all([
      getManagerHistory(managerId, sessionId),
      getPlatformConfig(),
    ]);

    const maxToolIterations = platformConfig.maxToolIterations || DEFAULT_MAX_TOOL_ITERATIONS;

    const restaurantName = business.settings?.name ?? business.name;
    const currency = business.settings?.currency ?? 'SAR';
    const managerName = manager.name ?? 'Manager';

    const systemPrompt = await buildManagerSystemPrompt({
      restaurantName,
      currency,
      businessId: this.businessId,
      managerName,
    });

    const historyMessages = trimHistoryToBudget(history, MAX_HISTORY_TOKENS, MAX_HISTORY_MESSAGES);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const ctx: ManagerToolContext = {
      businessId: this.businessId,
      managerId,
      managerPhone,
      business,
      manager,
    };

    let finalResponse = 'Sorry, I encountered an issue. Please try again.';
    let didSendMessage = false;
    const toolCallFingerprints = new Set<string>();

    for (let iteration = 1; iteration <= maxToolIterations; iteration++) {
      let llmResponse;
      try {
        llmResponse = await this.llmProvider.chat(messages, MANAGER_TOOL_DEFINITIONS);
      } catch (llmError: any) {
        console.error(`[ManagerAgent] LLM error on iteration ${iteration}: ${llmError?.message}`);
        throw llmError;
      }

      finalResponse = llmResponse.content || finalResponse;

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
        const fingerprint = `${toolCall.name}:${JSON.stringify(toolCall.arguments)}`;
        if (toolCallFingerprints.has(fingerprint)) {
          messages.push({
            role: 'tool' as any,
            content: `Tool ${toolCall.name} already called with identical arguments. Try a different approach.`,
            toolCallId: toolCall.id,
          });
          continue;
        }
        toolCallFingerprints.add(fingerprint);

        console.log(`[ManagerAgent] Tool call: ${toolCall.name} (iteration ${iteration})`);

        let execution;
        const toolPromise = executeManagerTool(toolCall, ctx);
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
          console.error(`[ManagerAgent] Tool error (${toolCall.name}): ${toolError?.message}`);
          execution = {
            success: false,
            result: 'The tool encountered an error. Please try again.',
            errorCode: 'TOOL_CRASHED',
          };
        } finally {
          clearTimeout(timeoutHandle!);
          toolPromise.catch(() => {});
        }

        if (execution.didSendMessage) {
          didSendMessage = true;
        }

        messages.push({
          role: 'tool' as any,
          content: sanitizeToolOutput(execution.result),
          toolCallId: toolCall.id,
        });
      }
    }

    await saveManagerMessage(managerId, sessionId, 'user', message);
    await saveManagerMessage(managerId, sessionId, 'assistant', finalResponse);

    return { reply: finalResponse, didSendMessage };
  }
}
