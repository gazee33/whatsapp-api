// backend/src/services/debug.ts
import { DebugStep, StepData, ConversationDebugEntry } from "../debug/types.js";

/**
 * Logs conversation debug entries to the backend console/file instead of database.
 * This keeps detailed conversation logs without increasing database size.
 * Logs are formatted as structured, readable JSON entries.
 */

const isProduction = process.env.NODE_ENV === 'production';

// In-memory storage for the current session only (resets on server restart)
// This allows basic debugging during runtime without persisting to DB
const debugLogs: ConversationDebugEntry[] = [];

const STEP_LABELS: Record<DebugStep, string> = {
  [DebugStep.Prompt]: '📤 LLM Prompt',
  [DebugStep.Response]: '📥 LLM Response',
  [DebugStep.ToolCall]: '🔧 Tool Call',
  [DebugStep.ToolResult]: '✅ Tool Result',
  [DebugStep.Decision]: '🎯 AI Decision',
};

function formatStepData(step: DebugStep, data: StepData): string {
  switch (step) {
    case DebugStep.Prompt:
      return `System: ${(data as any).prompt?.system?.substring(0, 100)}...`;
    case DebugStep.Response:
      const response = (data as any).response;
      if (response?.toolCalls?.length) {
        return `Tools called: ${response.toolCalls.map((t: any) => t.name).join(', ')}`;
      }
      return `Response: ${JSON.stringify(response?.fullResponse)?.substring(0, 100)}...`;
    case DebugStep.ToolCall:
      return `Tool: ${(data as any).toolCall?.name} - Args: ${JSON.stringify((data as any).toolCall?.args)}`;
    case DebugStep.ToolResult:
      const result = (data as any).toolResult;
      return `Tool: ${result?.name} - ${result?.error ? `Error: ${result.error}` : 'Success'}`;
    case DebugStep.Decision:
      const decision = (data as any).decision;
      return `${decision?.type}: ${JSON.stringify(decision?.details)?.substring(0, 100)}`;
    default:
      return JSON.stringify(data);
  }
}

export async function logDebugEntry(
  customerId: string,
  sessionId: string,
  step: DebugStep,
  data: StepData,
  durationMs?: number,
  tokenUsage?: number
): Promise<void> {
  const timestamp = new Date().toISOString();
  const stepLabel = STEP_LABELS[step] || step;

  // Create structured entry for potential in-memory storage
  const entry: ConversationDebugEntry = {
    customerId,
    sessionId,
    step,
    stepData: data,
    durationMs,
    tokenUsage,
    createdAt: new Date(),
  };

  debugLogs.push(entry);

  // Only log metadata in production to reduce log volume
  if (isProduction) {
    console.log(`[AI] ${stepLabel} | customer=${customerId.substring(0, 8)}... | ${durationMs !== undefined ? `${durationMs}ms` : ''}`);
    return;
  }

  // Full debug logging in development
  console.log('\n' + '='.repeat(60));
  console.log(`🤖 AI Agent Debug Log | ${stepLabel}`);
  console.log('='.repeat(60));
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`👤 Customer ID: ${customerId}`);
  console.log(`🔖 Session ID: ${sessionId}`);
  if (durationMs !== undefined) console.log(`⏱️  Duration: ${durationMs}ms`);
  if (tokenUsage !== undefined) console.log(`🔢 Tokens: ${tokenUsage}`);
  console.log('-'.repeat(60));
  console.log(formatStepData(step, data));
  console.log('='.repeat(60) + '\n');

  // Also log the full JSON for detailed debugging
  console.log(`[DEBUG-JSON] ${JSON.stringify({
    timestamp,
    customerId: customerId.substring(0, 8) + '...',
    sessionId: sessionId.substring(0, 8) + '...',
    step,
    stepData: data,
    durationMs,
    tokenUsage,
  })}\n`);
}

// Keep these functions for API compatibility but they now work with in-memory storage
export async function getDebugHistory(
  customerId: string,
  sessionId?: string
): Promise<ConversationDebugEntry[]> {
  let entries = debugLogs.filter(log => log.customerId === customerId);
  if (sessionId) {
    entries = entries.filter(log => log.sessionId === sessionId);
  }
  return entries.sort((a, b) => 
    (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
  );
}

export async function clearDebugHistory(
  customerId: string,
  sessionId?: string
): Promise<void> {
  const index = sessionId
    ? debugLogs.findIndex(log => log.customerId === customerId && log.sessionId === sessionId)
    : debugLogs.findIndex(log => log.customerId === customerId);
  
  if (sessionId) {
    // Clear specific session
    for (let i = debugLogs.length - 1; i >= 0; i--) {
      if (debugLogs[i].customerId === customerId && debugLogs[i].sessionId === sessionId) {
        debugLogs.splice(i, 1);
      }
    }
  } else {
    // Clear all for customer
    for (let i = debugLogs.length - 1; i >= 0; i--) {
      if (debugLogs[i].customerId === customerId) {
        debugLogs.splice(i, 1);
      }
    }
  }
  
  console.log(`[DEBUG] Cleared debug logs for customer ${customerId}${sessionId ? ` session ${sessionId}` : ''}`);
}
