import { Agent as HttpAgent } from 'http';
import {
  ChatMessage,
  ToolDefinition,
  LLMResponse,
  LLMProvider,
} from './types.js';
import { config } from '../config.js';

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private modelName: string;
  private autoFallback: boolean;
  private keepAliveAgent: HttpAgent;

  constructor(modelName: string = 'gemma4:latest', autoFallback: boolean = false) {
    this.modelName = modelName;
    this.baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
    this.autoFallback = autoFallback;
    this.keepAliveAgent = new HttpAgent({
      keepAlive: true,
      maxSockets: 10,
      keepAliveMsecs: 30000,
    });
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    console.log('[Ollama] Calling', this.baseUrl, 'with model', this.modelName);

    const startTime = Date.now();

    try {
      const url = this.baseUrl + '/api/chat';

      const ollamaMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const requestBody: Record<string, unknown> = {
        model: this.modelName,
        messages: ollamaMessages,
        stream: true,
      };

      if (tools.length > 0) {
        requestBody.tools = tools;
      }

      const fetchStart = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher: this.keepAliveAgent as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Ollama error: ' + response.status + ' ' + errorText);
      }

      // Process streaming response (SSE - newline-delimited JSON)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let content = '';
      let toolCalls: Array<{ function: { name: string; arguments: string } }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('{')) continue;

          try {
            const data = JSON.parse(line);

            if (data.error) {
              throw new Error('Ollama error: ' + data.error);
            }

            // Accumulate content
            if (data.message?.content) {
              content += data.message.content;
            }

            // Collect tool calls
            if (data.message?.tool_calls) {
              toolCalls = toolCalls.concat(data.message.tool_calls);
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      const elapsed = Date.now() - startTime;
      console.log('[Ollama] Response time:', elapsed, 'ms');

      const parsedToolCalls = toolCalls.map((tc, index) => ({
        id: `call_${index}`,
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
      }));

      return {
        content: content || null,
        toolCalls: parsedToolCalls,
      };
    } catch (error) {
      console.log('[Ollama] Error:', (error as Error).message);
      if (this.autoFallback && this.isConnectionError(error)) {
        return this.createMockResponse(messages);
      }
      throw error;
    }
  }

  private isConnectionError(error: unknown): boolean {
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return true;
    }
    if (error instanceof Error) {
      return error.message.includes('ECONNREFUSED') ||
             error.message.includes('connect ECONNREFUSED') ||
             error.message.includes('fetch failed') ||
             error.message.includes('ENETUNREACH');
    }
    return false;
  }

  private createMockResponse(messages: ChatMessage[]): LLMResponse {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    let responseText = "I'm sorry, the local AI service is not available. ";

    if (lastUserMessage.toLowerCase().includes('shawarma')) {
      responseText = "I can help you order Shawarma Chicken at SAR 5 each. How many would you like?";
    } else if (lastUserMessage.toLowerCase().includes('menu')) {
      responseText = "We have: Shawarma Chicken (SAR 5), Shawarma Meat (SAR 6), Falafel Wrap (SAR 4), Grilled Chicken Plate (SAR 12), Mixed Grill (SAR 18), and more. What would you like to order?";
    } else if (lastUserMessage.toLowerCase().includes('order')) {
      responseText = "I can help you place an order. Would you like to see our menu first?";
    } else {
      responseText += "Our menu includes sandwiches, meals, sides, drinks, and desserts. How can I help you?";
    }

    return { content: responseText, toolCalls: [] };
  }
}
