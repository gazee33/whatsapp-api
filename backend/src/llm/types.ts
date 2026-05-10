export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  imageData?: { data: string; mimeType: string };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  reasoningContent?: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse>;
}
