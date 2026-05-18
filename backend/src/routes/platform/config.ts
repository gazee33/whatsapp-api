import { Router, Request, Response } from 'express';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';
import type { PlatformConfig } from '@prisma/client';
import {
  getPlatformConfig,
  updatePlatformConfig,
  validatePromptTemplate,
} from '../../services/platform-config.js';
import { clearSystemPromptCache } from '../../services/ai-engine/prompt-builder.js';

const PROMPT_RELATED_FIELDS = [
  'promptTemplate', 'enableCustomPrompt',
  'identityTemplate', 'workflowTemplate', 'guardrailsTemplate', 'toolsTemplate', 'interactiveTemplate',
  'providerFailoverOrder', 'globalForbiddenWords',
] as const;

function serializeConfig(config: PlatformConfig) {
  return {
    id: config.id,
    promptTemplate: config.promptTemplate,
    promptVersion: config.promptVersion,
    enableCustomPrompt: config.enableCustomPrompt,
    identityTemplate: config.identityTemplate,
    workflowTemplate: config.workflowTemplate,
    guardrailsTemplate: config.guardrailsTemplate,
    toolsTemplate: config.toolsTemplate,
    interactiveTemplate: config.interactiveTemplate,
    forbiddenPatterns: config.forbiddenPatterns,
    maxCustomRuleLength: config.maxCustomRuleLength,
    defaultLLMProvider: config.defaultLLMProvider,
    defaultLLMModel: config.defaultLLMModel,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    maxToolIterations: config.maxToolIterations,
    interactiveListMessagesEnabled: config.interactiveListMessagesEnabled,
    interactiveButtonsMessagesEnabled: config.interactiveButtonsMessagesEnabled,
    complaintToolEnabled: config.complaintToolEnabled,
    orderStatusToolEnabled: config.orderStatusToolEnabled,
    flagCustomerToolEnabled: config.flagCustomerToolEnabled,
    autoUpsellEnabled: config.autoUpsellEnabled,
    providerFailoverOrder: config.providerFailoverOrder,
    globalForbiddenWords: config.globalForbiddenWords,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

const VALID_PROVIDERS = ['gemini', 'openai', 'ollama', 'groq', 'opencode', 'mock'];

const router = Router();

router.get(
  '/',
  requirePlatformPermission('platform:read'),
  async (_req: Request, res: Response) => {
    try {
      const config = await getPlatformConfig();
      res.json(serializeConfig(config));
    } catch (error) {
      console.error('Get platform config error:', error);
      res.status(500).json({ error: 'Failed to fetch platform config' });
    }
  },
);

router.put(
  '/',
  requirePlatformPermission('platform:settings'),
  async (req: Request, res: Response) => {
    try {
      const {
        promptTemplate,
        enableCustomPrompt,
        identityTemplate,
        workflowTemplate,
        guardrailsTemplate,
        toolsTemplate,
        interactiveTemplate,
        forbiddenPatterns,
        maxCustomRuleLength,
        defaultLLMProvider,
        defaultLLMModel,
        maxTokens,
        temperature,
        maxToolIterations,
        interactiveListMessagesEnabled,
        interactiveButtonsMessagesEnabled,
        complaintToolEnabled,
        orderStatusToolEnabled,
        flagCustomerToolEnabled,
        autoUpsellEnabled,
        providerFailoverOrder,
        globalForbiddenWords,
        isActive,
      } = req.body;

      if (forbiddenPatterns !== undefined) {
        try {
          const parsed = JSON.parse(forbiddenPatterns);
          if (!Array.isArray(parsed) || parsed.some((p) => typeof p !== 'string')) {
            return res.status(400).json({ error: 'forbiddenPatterns must be a JSON array of strings.' });
          }
          // Validate each pattern compiles as a regex.
          for (const p of parsed) {
            try { new RegExp(p as string); } catch {
              return res.status(400).json({ error: `Invalid regex in forbiddenPatterns: "${p}"` });
            }
          }
        } catch {
          return res.status(400).json({ error: 'forbiddenPatterns must be valid JSON.' });
        }
      }

      if (maxCustomRuleLength !== undefined && (maxCustomRuleLength < 50 || maxCustomRuleLength > 5000)) {
        return res.status(400).json({ error: 'maxCustomRuleLength must be between 50 and 5000.' });
      }

      if (promptTemplate !== undefined) {
        const validation = validatePromptTemplate(promptTemplate);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
      }

      if (defaultLLMProvider !== undefined) {
        if (!VALID_PROVIDERS.includes(defaultLLMProvider)) {
          return res.status(400).json({
            error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
          });
        }
      }

      if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
        return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
      }

      if (maxTokens !== undefined && maxTokens < 1) {
        return res.status(400).json({ error: 'maxTokens must be greater than 0' });
      }

      if (maxToolIterations !== undefined && maxToolIterations < 1) {
        return res.status(400).json({ error: 'maxToolIterations must be greater than 0' });
      }

      if (providerFailoverOrder !== undefined) {
        try {
          const parsed = JSON.parse(providerFailoverOrder);
          if (!Array.isArray(parsed)) {
            return res.status(400).json({ error: 'providerFailoverOrder must be a JSON array.' });
          }
          for (const p of parsed) {
            if (typeof p !== 'string' || !VALID_PROVIDERS.includes(p)) {
              return res.status(400).json({
                error: `Invalid provider "${p}" in providerFailoverOrder. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
              });
            }
          }
        } catch {
          return res.status(400).json({ error: 'providerFailoverOrder must be valid JSON.' });
        }
      }

      if (globalForbiddenWords !== undefined) {
        try {
          const parsed = JSON.parse(globalForbiddenWords);
          if (!Array.isArray(parsed)) {
            return res.status(400).json({ error: 'globalForbiddenWords must be a JSON array.' });
          }
          if (parsed.length > 200) {
            return res.status(400).json({ error: 'globalForbiddenWords may not exceed 200 entries.' });
          }
          for (const w of parsed) {
            if (typeof w !== 'string') {
              return res.status(400).json({ error: 'All entries in globalForbiddenWords must be strings.' });
            }
            if (w.length > 50) {
              return res.status(400).json({ error: `Word "${w.slice(0, 30)}…" exceeds the 50-character limit.` });
            }
          }
        } catch {
          return res.status(400).json({ error: 'globalForbiddenWords must be valid JSON.' });
        }
      }

      // Auto-bump promptVersion whenever any prompt-related field changes so the cache busts automatically.
      const promptFieldChanged = PROMPT_RELATED_FIELDS.some((f) => req.body[f] !== undefined);
      const autoPromptVersion = promptFieldChanged ? String(Date.now()) : undefined;

      const config = await updatePlatformConfig({
        promptTemplate,
        promptVersion: autoPromptVersion,
        enableCustomPrompt,
        identityTemplate,
        workflowTemplate,
        guardrailsTemplate,
        toolsTemplate,
        interactiveTemplate,
        forbiddenPatterns,
        maxCustomRuleLength,
        defaultLLMProvider,
        defaultLLMModel,
        maxTokens,
        temperature,
        maxToolIterations,
        interactiveListMessagesEnabled,
        interactiveButtonsMessagesEnabled,
        complaintToolEnabled,
        orderStatusToolEnabled,
        flagCustomerToolEnabled,
        autoUpsellEnabled,
        providerFailoverOrder,
        globalForbiddenWords,
        isActive,
      });

      clearSystemPromptCache();
      res.json(serializeConfig(config));
    } catch (error) {
      console.error('Update platform config error:', error);
      res.status(500).json({ error: 'Failed to update platform config' });
    }
  },
);

export default router;
