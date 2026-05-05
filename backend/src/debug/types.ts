// backend/src/debug/types.ts

export enum DebugStep {
  Prompt = "prompt",
  Response = "response",
  ToolCall = "tool_call",
  ToolResult = "tool_result",
  Decision = "decision",
}

export interface BaseDebugData {
  timestamp: string;
  durationMs?: number;
  tokenUsage?: number;
}

export interface PromptDebugData extends BaseDebugData {
  prompt: {
    system: string;
    messages: Array<{ role: string; content: string }>;
  };
}

export interface ResponseDebugData extends BaseDebugData {
  response: {
    iteration?: number;
    fullResponse: any; // Raw LLM response
    toolCalls?: Array<{ name: string; args: any }>;
  };
}

export interface ToolCallDebugData extends BaseDebugData {
  toolCall: {
    iteration?: number;
    name: string;
    args: any;
  };
}

export interface ToolResultDebugData extends BaseDebugData {
  toolResult: {
    iteration?: number;
    name: string;
    result: any;
    error?: string;
  };
}

export interface DecisionDebugData extends BaseDebugData {
  decision: {
    type: string; // e.g., "language_detection", "cart_state_change", "intent_detection"
    details: any;
  };
}

export type StepData =
  | PromptDebugData
  | ResponseDebugData
  | ToolCallDebugData
  | ToolResultDebugData
  | DecisionDebugData;

export interface ConversationDebugEntry {
  id?: string;
  customerId: string;
  sessionId: string;
  step: DebugStep;
  stepData: StepData;
  durationMs?: number;
  tokenUsage?: number;
  createdAt?: Date;
}
