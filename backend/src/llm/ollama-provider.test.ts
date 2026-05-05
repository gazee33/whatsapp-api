import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from './ollama-provider.js';
import { Agent } from 'http';

// Mock the config
vi.mock('../config.js', () => ({
  config: {
    ollamaBaseUrl: 'http://localhost:11434',
  },
}));

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider('gemma4:latest', false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have a keepAliveAgent configured', () => {
    // Access the private keepAliveAgent through the provider instance
    const agent = (provider as any).keepAliveAgent;
    
    expect(agent).toBeDefined();
    expect(agent.keepAlive).toBe(true);
    expect(agent.maxSockets).toBe(10);
    expect(agent.keepAliveMsecs).toBe(30000);
  });

  it('should create agent with correct default options', () => {
    const agent = (provider as any).keepAliveAgent;
    
    expect(agent).toBeInstanceOf(Agent);
  });

  it('should use different model name when provided', () => {
    const customProvider = new OllamaProvider('llama3:latest', false);
    expect(customProvider).toBeDefined();
    // The model name is stored internally
  });
});