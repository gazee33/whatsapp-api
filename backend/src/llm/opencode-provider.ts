import {
  ChatMessage,
  ToolDefinition,
  LLMResponse,
  LLMProvider,
} from './types.js';
import { config } from '../config.js';

export class OpencodeProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(model: string = 'deepseek-v4-flash') {
    this.apiKey = config.opencodeApiKey;
    this.model = model;
    this.baseUrl = 'https://opencode.ai/zen/go/v1';
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    const formattedMessages = messages.map(msg => {
      const base = {
        role: msg.role,
        content: msg.content,
      };
      
      // Include tool_call_id for tool results
      if (msg.role === 'tool' && (msg as any).toolCallId) {
        return {
          ...base,
          tool_call_id: (msg as any).toolCallId,
        };
      }
      
      // Include tool calls and reasoning_content for assistant messages
      if (msg.role === 'assistant' && (msg as any).toolCalls) {
        const formatted: Record<string, unknown> = {
          ...base,
          tool_calls: (msg as any).toolCalls.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
            },
          })),
        };
        if ((msg as any).reasoningContent) {
          formatted.reasoning_content = (msg as any).reasoningContent;
        }
        return formatted;
      }
      
      return base;
    });

    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: formattedMessages,
      max_tokens: 1024,
      stream: false,
    };

    if (tools.length > 0) {
      requestBody.tools = tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }

    console.log(`[Opencode] Calling model=${this.model}, messages=${messages.length}, tools=${tools.length}`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Opencode] API error (model=${this.model}, status=${response.status}): ${errorText}`);
      throw new Error(`OpenCode API error ${response.status} (model=${this.model}): ${errorText.substring(0, 300)}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string | null;
          reasoning_content?: string;
          tool_calls?: Array<{
            id: string;
            function: {
              name: string;
              arguments: string;
            };
          }>;
        };
      }>;
    };

    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('OpenCode API returned no choices');
    }

    const content = choice.message.content || null;
    const reasoningContent = choice.message.reasoning_content || undefined;
    const toolCalls = choice.message.tool_calls?.map(tc => {
      let parsedArgs: Record<string, unknown>;
      try {
        parsedArgs = typeof tc.function.arguments === 'string'
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
      } catch {
        parsedArgs = {};
      }

      return {
        id: tc.id,
        name: tc.function.name,
        arguments: parsedArgs,
      };
    }) || [];

    return { content, toolCalls, reasoningContent };
  }
}
