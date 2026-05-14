import { LLMProvider } from './types.js';
import { GeminiProvider } from './gemini-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { GroqProvider } from './groq-provider.js';
import { MockProvider } from './mock-provider.js';
import { OpencodeProvider } from './opencode-provider.js';
import { config } from '../config.js';
import { getPlatformConfig } from '../services/platform-config.js';

export async function createLLMProvider(
  provider?: string,
  model?: string
): Promise<LLMProvider> {
  let p = provider;
  let m = model;

  if (!p || !m) {
    try {
      const platformConfig = await getPlatformConfig();
      if (!p) p = platformConfig.defaultLLMProvider;
      if (!m) m = platformConfig.defaultLLMModel;
    } catch {
      // Fall back to config defaults if platform config fails
      if (!p) p = config.llmProvider;
      if (!m) m = config.llmModel;
    }
  }

  if (!p) p = config.llmProvider;
  if (!m) m = config.llmModel;

  switch (p) {
    case 'gemini': {
      // Check if API key is a valid non-placeholder key
      const apiKey = config.geminiApiKey;
      if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === '') {
        console.warn('Using MockProvider because GEMINI_API_KEY is not configured or is placeholder');
        return new MockProvider(m);
      }
      return new GeminiProvider(m);
    }
    case 'openai': {
      const apiKey = config.openaiApiKey;
      if (!apiKey || apiKey === '') {
        console.warn('Using MockProvider because OPENAI_API_KEY is not configured');
        return new MockProvider(m);
      }
      return new OpenAIProvider(m);
    }
    case 'ollama':
    case 'gemma': {
      const modelToUse = m || config.llmModel;
      return new OllamaProvider(modelToUse, true);
    }
    case 'groq': {
      const apiKey = config.groqApiKey;
      if (!apiKey || apiKey === '') {
        console.warn('Using MockProvider because GROQ_API_KEY is not configured');
        return new MockProvider(m);
      }
      return new GroqProvider(m);
    }
    case 'opencode': {
      const apiKey = config.opencodeApiKey;
      if (!apiKey || apiKey === '') {
        console.warn('Using MockProvider because OPENCODE_API_KEY is not configured');
        return new MockProvider(m);
      }
      return new OpencodeProvider(m);
    }
    case 'mock': {
      return new MockProvider(m);
    }
    default: {
      // Check gemini key as default fallback
      const apiKey = config.geminiApiKey;
      if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === '') {
        console.warn('Using MockProvider because default LLM provider has no valid API key');
        return new MockProvider(m);
      }
      return new GeminiProvider(config.llmModel);
    }
  }
}
