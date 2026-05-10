import OpenAI from 'openai';
import {
  ChatMessage,
  ToolDefinition,
  ToolCall,
  LLMResponse,
  LLMProvider,
} from './types.js';
import { config } from '../config.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private modelName: string;

  constructor(modelName: string = 'gpt-4o-mini') {
    this.modelName = modelName;
    const apiKey = config.openaiApiKey;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.client = new OpenAI({ apiKey });
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    // Build OpenAI format messages
    const openaiMessages = this.buildMessages(messages);

    // Build tools for OpenAI format
    const openaiTools =
      tools.length > 0
        ? tools.map((tool) => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: this.buildToolParameters(tool.parameters),
            },
          }))
        : undefined;

    let response: any;
    try {
      response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: openaiMessages,
        tools: openaiTools,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });
    } catch (error: any) {
      if (error.status || error.code) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }

    if (!response.choices || response.choices.length === 0) {
      return { content: null, toolCalls: [] };
    }
    const choice = response.choices[0];
    if (!choice) {
      return { content: null, toolCalls: [] };
    }

    const message = choice.message;

    // Check for tool calls
    const toolCalls: ToolCall[] = [];
    let textContent: string | null = null;

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        // Handle different tool call types from OpenAI SDK
        const functionData = 'function' in tc ? tc.function : null;
        if (functionData) {
          const args =
            typeof functionData.arguments === 'string'
              ? JSON.parse(functionData.arguments)
              : functionData.arguments;

          toolCalls.push({
            id: tc.id,
            name: functionData.name,
            arguments: args,
          });
        }
      }
    }

    textContent = message.content;

    return {
      content: textContent,
      toolCalls,
    };
  }

  private buildMessages(messages: ChatMessage[]): any[] {
    const result: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Add as a system message
        result.push({
          role: 'system',
          content: msg.content,
        });
      } else if (msg.role === 'tool') {
        // Tool result from previous function call
        result.push({
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId,
        });
      } else if (msg.role === 'assistant' && (msg as any).toolCalls) {
        const toolCalls = (msg as any).toolCalls;
        result.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: toolCalls.map((tc: any) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments:
                typeof tc.arguments === 'string'
                  ? tc.arguments
                  : JSON.stringify(tc.arguments),
            },
          })),
        });
      } else if (msg.imageData && msg.role === 'user') {
        result.push({
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: `data:${msg.imageData.mimeType};base64,${msg.imageData.data}` } },
          ],
        });
      } else {
        result.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return result;
  }

  private buildToolParameters(
    params: Record<string, any>
  ): Record<string, any> {
    // If params already has 'properties' at the top level, it's a complete JSON Schema — pass through
    if (params.properties && typeof params.properties === 'object') {
      return params;
    }

    // Legacy flat format: { query: { type: 'string', description: '...' }, ... }
    return {
      type: 'object',
      properties: this.buildParameterProperties(params),
      required: this.getRequiredParams(params),
    };
  }

  private buildParameterProperties(
    params: Record<string, any>
  ): Record<string, any> {
    const properties: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object' && value !== null && 'type' in value) {
        properties[key] = {
          type: value.type as string,
          description: (value as any).description || '',
          enum: (value as any).enum ? Object.values((value as any).enum) : undefined,
        };
      } else {
        properties[key] = {
          type: 'string',
          description: '',
        };
      }
    }

    return properties;
  }

  private getRequiredParams(params: Record<string, any>): string[] {
    const required: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object' && value !== null && (value as any).required) {
        required.push(key);
      }
    }

    return required;
  }
}
