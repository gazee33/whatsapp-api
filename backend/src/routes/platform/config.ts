import { Router, Request, Response } from 'express';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';
import type { PlatformConfig } from '@prisma/client';
import {
  getPlatformConfig,
  updatePlatformConfig,
  validatePromptTemplate,
} from '../../services/platform-config.js';

function serializeConfig(config: PlatformConfig) {
  return {
    id: config.id,
    promptTemplate: config.promptTemplate,
    promptVersion: config.promptVersion,
    enableCustomPrompt: config.enableCustomPrompt,
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
        promptVersion,
        enableCustomPrompt,
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
        isActive,
      } = req.body;

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

      const config = await updatePlatformConfig({
        promptTemplate,
        promptVersion,
        enableCustomPrompt,
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
        isActive,
      });

      res.json(serializeConfig(config));
    } catch (error) {
      console.error('Update platform config error:', error);
      res.status(500).json({ error: 'Failed to update platform config' });
    }
  },
);

export default router;
