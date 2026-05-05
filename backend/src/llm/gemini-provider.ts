import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ChatMessage,
  ToolDefinition,
  ToolCall,
  LLMResponse,
  LLMProvider,
} from './types.js';
import { config } from '../config.js';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(modelName: string = 'gemini-2.0-flash') {
    this.modelName = modelName;
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async chat(
    messages: ChatMessage[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const systemMsg = this.extractSystemMessage(messages);
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemMsg ? { role: 'system', parts: [{ text: systemMsg }] } : undefined,
    });

    const contents = this.buildContents(messages);
    const functionDeclarations = tools.length > 0
      ? {
          functionDeclarations: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: {
              type: 'object',
              properties: this.buildParameterProperties(tool.parameters),
              required: this.getRequiredParams(tool.parameters),
            },
          })),
        }
      : undefined;

    const requestPayload: any = {
      contents,
    };

    if (functionDeclarations) {
      requestPayload.tools = functionDeclarations;
    }

    let result: any;
    try {
      result = await model.generateContent(requestPayload);
    } catch (error: any) {
      if (error.message?.includes('GoogleGenerativeAIError') || error.cause?.message?.includes('API')) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw error;
    }

    const response = result.response;
    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    const parts = content?.parts || [];

    // Check for function calls
    const toolCalls: ToolCall[] = [];
    let textContent: string | null = null;

    for (const part of parts) {
      const fc = (part as any).functionCall;
      if (fc) {
        // Parse arguments - they might be a string or already an object
        let args: Record<string, any>;
        if (typeof fc.args === 'string') {
          try {
            args = JSON.parse(fc.args);
          } catch {
            args = {};
          }
        } else if (fc.args && typeof fc.args === 'object') {
          args = fc.args as Record<string, any>;
        } else {
          args = {};
        }

        toolCalls.push({
          id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: fc.name as string,
          arguments: args,
        });
      } else if ('text' in part && part.text) {
        textContent = part.text;
      }
    }

    return {
      content: textContent,
      toolCalls,
    };
  }

  private extractSystemMessage(messages: ChatMessage[]): string | undefined {
    const systemMsg = messages.find((m) => m.role === 'system');
    return systemMsg?.content;
  }

  private buildContents(messages: ChatMessage[]): any[] {
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        continue; // System messages handled separately
      }

      if (msg.role === 'tool') {
        // Tool results from previous calls
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content }],
        });
      }
    }

    return contents;
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
