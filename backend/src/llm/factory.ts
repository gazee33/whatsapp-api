import type { ChatMessage, LLMProvider, LLMResponse, ToolDefinition } from './types.js';
import { GeminiProvider } from './gemini-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { GroqProvider } from './groq-provider.js';
import { MockProvider } from './mock-provider.js';
import { OpencodeProvider } from './opencode-provider.js';
import { config } from '../config.js';
import { getPlatformConfig } from '../services/platform-config.js';

/**
 * Determine whether an error is a client/validation error (4xx).
 * These should NOT trigger failover — the request itself is broken.
 */
function isClientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as Record<string, unknown>).status ?? (error as Record<string, unknown>).statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) return true;
  const msg = String((error as Error).message ?? '');
  // Common 4xx signal words from LLM SDKs
  return /invalid.?api.?key|api.?key.?invalid|401|403|bad.?request|400/.test(msg);
}

/**
 * Build a concrete LLMProvider from a provider name.
 * Does NOT read platform config — caller is responsible for passing the name.
 */
export function buildProvider(providerName: string, model: string): LLMProvider {
  switch (providerName) {
    case 'gemini': {
      const apiKey = config.geminiApiKey;
      if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === '') {
        console.warn('Using MockProvider because GEMINI_API_KEY is not configured or is placeholder');
        return new MockProvider(model);
      }
      return new GeminiProvider(model);
    }
    case 'openai': {
      const apiKey = config.openaiApiKey;
      if (!apiKey || apiKey === '') {
        console.warn('Using MockProvider because OPENAI_API_KEY is not configured');
        return new MockProvider(model);
      }
      return new OpenAIProvider(model);
    }
    case 'ollama':
    case 'gemma': {
      return new OllamaProvider(model || config.llmModel, true);
    }
    case 'groq': {
      const apiKey = config.groqApiKey;
      if (!apiKey || apiKey === '') {
        console.warn('Using MockProvider because GROQ_API_KEY is not configured');
        return new MockProvider(model);
      }
      return new GroqProvider(model);
    }
    case 'opencode': {
      const apiKey = config.opencodeApiKey;
      if (!apiKey || apiKey === '') {
        console.warn('Using MockProvider because OPENCODE_API_KEY is not configured');
        return new MockProvider(model);
      }
      return new OpencodeProvider(model);
    }
    case 'mock': {
      return new MockProvider(model);
    }
    default: {
      const apiKey = config.geminiApiKey;
      if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === '') {
        console.warn('Using MockProvider because default LLM provider has no valid API key');
        return new MockProvider(model);
      }
      return new GeminiProvider(config.llmModel);
    }
  }
}

/**
 * Wrap a list of provider names into a single LLMProvider that automatically
 * falls over to the next provider on non-client errors.
 *
 * @param providerNames Ordered list of provider names to try. The first is primary.
 * @param model         Model name to pass to each provider.
 */
export function createProviderWithFailover(providerNames: string[], model: string): LLMProvider {
  if (providerNames.length === 0) {
    throw new Error('providerNames must not be empty');
  }

  const providers = providerNames.map((name) => buildProvider(name, model));

  async function tryChat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    providerIndex: number,
  ): Promise<LLMResponse> {
    const provider = providers[providerIndex];
    try {
      return await provider.chat(messages, tools);
    } catch (err) {
      const isLast = providerIndex >= providers.length - 1;
      if (isLast || isClientError(err)) {
        throw err;
      }
      console.warn(
        `[LLM Failover] Provider "${providerNames[providerIndex]}" failed, trying "${providerNames[providerIndex + 1]}"`,
        (err as Error)?.message,
      );
      return tryChat(messages, tools, providerIndex + 1);
    }
  }

  return {
    chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
      return tryChat(messages, tools, 0);
    },
  };
}

export async function createLLMProvider(
  provider?: string,
  model?: string,
): Promise<LLMProvider> {
  let p = provider;
  let m = model;

  let providerFailoverOrder: string[] = [];

  try {
    const platformConfig = await getPlatformConfig();
    if (!p) p = platformConfig.defaultLLMProvider;
    if (!m) m = platformConfig.defaultLLMModel;

    // Parse failover list — only use when no explicit provider was passed
    if (!provider) {
      try {
        const parsed = JSON.parse(platformConfig.providerFailoverOrder ?? '[]');
        if (Array.isArray(parsed) && parsed.length > 1) {
          providerFailoverOrder = parsed.filter((x): x is string => typeof x === 'string');
        }
      } catch {
        // ignore parse errors
      }
    }
  } catch {
    // Fall back to config defaults if platform config fails
    if (!p) p = config.llmProvider;
    if (!m) m = config.llmModel;
  }

  if (!p) p = config.llmProvider;
  if (!m) m = config.llmModel;

  // Use failover chain if configured (and no explicit provider override)
  if (providerFailoverOrder.length > 1) {
    console.log(`[LLM] Using failover chain: ${providerFailoverOrder.join(' → ')}`);
    return createProviderWithFailover(providerFailoverOrder, m);
  }

  return buildProvider(p, m);
}
