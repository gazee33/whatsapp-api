import {
  ChatMessage,
  ToolDefinition,
  ToolCall,
  LLMResponse,
  LLMProvider,
} from './types.js';
import { config } from '../config.js';

interface GroqMessage {
  role: string;
  content: string;
  tool_call_id?: string;
}

interface GroqToolCall {
  function?: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
  name?: string;
  arguments?: string | Record<string, unknown>;
}

interface GroqResponseData {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: GroqToolCall[];
    };
  }>;
}

export class GroqProvider implements LLMProvider {
  private baseUrl = 'https://api.groq.com/openai/v1';
  private modelName: string;

  constructor(modelName: string = 'llama-3.3-70b-versatile') {
    this.modelName = modelName;
    const apiKey = config.groqApiKey;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const groqMessages = this.buildMessages(messages);

    const groqTools =
      tools.length > 0
        ? tools.map((tool) => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          }))
        : undefined;

    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: groqMessages,
        tools: groqTools,
        tool_choice: 'auto',
        temperature: 0.5,
        max_completion_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as GroqResponseData;
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) {
      return { content: null, toolCalls: [] };
    }

    const toolCalls: ToolCall[] = [];
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        const func = 'function' in tc ? tc.function : null;
        const name = func?.name || ('name' in tc ? (tc as any).name : '');
        const rawArgs = func?.arguments || ('arguments' in tc ? (tc as any).arguments : null);

        let args: Record<string, unknown> = {};
        if (typeof rawArgs === 'string') {
          try {
            args = JSON.parse(rawArgs);
          } catch (parseError) {
            throw new Error(`Invalid JSON in tool arguments: ${(parseError as Error).message}`);
          }
        } else if (rawArgs) {
          args = rawArgs as Record<string, unknown>;
        }

        toolCalls.push({
          id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name as string,
          arguments: args as Record<string, any>,
        });
      }
    }

    return {
      content: message.content || null,
      toolCalls,
    };
  }

private async fetchWithRetry(url: string, options: RequestInit, retries = 3, delayMs = 3000): Promise<Response> {
    let lastResponse: Response | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(url, options);
      if (response.status === 429) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
          continue;
        }
      }
      lastResponse = response;
      break;
    }
    if (lastResponse) return lastResponse;
    return fetch(url, options);
  }

  private buildMessages(messages: ChatMessage[]): GroqMessage[] {
    const result: GroqMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        result.push({ role: 'system', content: msg.content });
      } else if (msg.role === 'tool') {
        result.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId,
        });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }

    return result;
  }
}