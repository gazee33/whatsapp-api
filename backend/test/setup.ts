import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Create test prisma client BEFORE any imports
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Override global prisma with test client
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test.db',
      },
    },
  });
}

// Set before importing other modules
Object.defineProperty(globalThis, 'prisma', {
  value: globalForPrisma.prisma,
  writable: true,
});

// Global test setup
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.LLM_PROVIDER = 'ollama';
  process.env.LLM_MODEL = 'gemma3:4b';
  process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

  // Ensure PlatformConfig exists
  const existing = await globalForPrisma.prisma!.platformConfig.findFirst();
  if (!existing) {
    await globalForPrisma.prisma!.platformConfig.create({
      data: {
        promptTemplate: JSON.stringify({
          version: '1.0',
          template: `## ROLE
{languageInstruction}

{roleDescription}

## CONTEXT
{contextBlock}

## FULL MENU (use exact IDs from this section — do NOT guess or make up items)
{menuBlock}

## WORKFLOW (only do steps not yet completed)
{workflowBlock}

{businessRulesBlock}

## GUARDRAILS (non-overridable platform rules)
{guardrailsBlock}

## TOOLS
{toolsBlock}

## INTERACTIVE MESSAGES (MANDATORY RULES)
{interactiveBlock}`,
        }),
        promptVersion: '1.0',
        defaultLLMProvider: process.env.LLM_PROVIDER || 'ollama',
        defaultLLMModel: process.env.LLM_MODEL || 'gemma3:4b',
      },
    });
  }
});

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  await globalForPrisma.prisma?.$disconnect();
});

afterEach(() => {
  vi.clearAllMocks();
});
