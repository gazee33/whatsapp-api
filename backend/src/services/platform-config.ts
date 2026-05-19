import { prisma } from '../lib/prisma.js';
import type { PlatformConfig } from '@prisma/client';
import { DEFAULT_TEMPLATE, DEFAULT_LLM_PROVIDER, DEFAULT_LLM_MODEL } from './default-template.js';

const CACHE_TTL_MS = 60000;
let cachedConfig: { data: PlatformConfig; expires: number } | null = null;

export interface UpdatePlatformConfigData {
  promptTemplate?: string;
  promptVersion?: string;
  enableCustomPrompt?: boolean;
  identityTemplate?: string;
  workflowTemplate?: string;
  guardrailsTemplate?: string;
  toolsTemplate?: string;
  interactiveTemplate?: string;
  forbiddenPatterns?: string;
  maxCustomRuleLength?: number;
  defaultLLMProvider?: string;
  defaultLLMModel?: string;
  maxTokens?: number;
  temperature?: number;
  maxToolIterations?: number;
  interactiveListMessagesEnabled?: boolean;
  interactiveButtonsMessagesEnabled?: boolean;
  complaintToolEnabled?: boolean;
  orderStatusToolEnabled?: boolean;
  flagCustomerToolEnabled?: boolean;
  autoUpsellEnabled?: boolean;
  providerFailoverOrder?: string;
  globalForbiddenWords?: string;
  isActive?: boolean;
  // Manager Assistant prompt fields (platform-level)
  managerEnabled?: boolean;
  managerIdentityTemplate?: string;
  managerWorkflowTemplate?: string;
  managerGuardrailsTemplate?: string;
  managerToolsTemplate?: string;
}

async function ensurePlatformConfig(): Promise<PlatformConfig> {
  const existing = await prisma.platformConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.platformConfig.create({
    data: {
      promptTemplate: DEFAULT_TEMPLATE,
      defaultLLMProvider: DEFAULT_LLM_PROVIDER,
      defaultLLMModel: DEFAULT_LLM_MODEL,
    },
  });
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  if (cachedConfig && cachedConfig.expires > Date.now()) {
    return cachedConfig.data;
  }

  const config = await ensurePlatformConfig();
  cachedConfig = { data: config, expires: Date.now() + CACHE_TTL_MS };
  return config;
}

export function invalidatePlatformConfigCache(): void {
  cachedConfig = null;
}

export async function updatePlatformConfig(
  data: UpdatePlatformConfigData,
): Promise<PlatformConfig> {
  const config = await ensurePlatformConfig();

  const updated = await prisma.platformConfig.update({
    where: { id: config.id },
    data,
  });

  invalidatePlatformConfigCache();
  return updated;
}

export function validatePromptTemplate(json: string): { valid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.template || typeof parsed.template !== 'string') {
      return { valid: false, error: 'Template must have a "template" string field' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid JSON' };
  }
}
