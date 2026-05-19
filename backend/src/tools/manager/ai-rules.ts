import { prisma } from '../../lib/prisma.js';
import type { ToolDefinition } from '../../llm/types.js';
import type { ManagerToolContext, ManagerToolResult } from './index.js';
import {
  validateCustomInstructions,
  validateEscalationKeywords,
  validateTonePreset,
  parseEscalationKeywords,
  VALID_TONE_PRESETS,
} from '../../services/ai-rules-validation.js';
import { clearSystemPromptCache } from '../../services/ai-engine/prompt-builder.js';
import { createAuditLog } from '../../services/audit.js';

// ── Tool definitions ──────────────────────────────────────────────────────────

export const managerGetAiRulesDefinition: ToolDefinition = {
  name: 'manager_get_ai_rules',
  description:
    'Read the current AI agent rules for this restaurant: custom instructions, tone preset, upsell settings, escalation keywords, and welcome message. Call this before updating rules so the manager can see what is currently set.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const managerUpdateAiRulesDefinition: ToolDefinition = {
  name: 'manager_update_ai_rules',
  description:
    'Update one or more AI agent behaviour settings for this restaurant. Only the fields you provide are changed — omitted fields keep their current value. Changes take effect immediately for all new customer conversations.',
  parameters: {
    type: 'object',
    properties: {
      customInstructions: {
        type: 'string',
        description:
          'Free-text rules appended to the customer AI agent\'s system prompt. Example: "Always upsell drinks with every order."',
      },
      escalationKeywords: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Additional phrases that trigger escalation to human support. Example: ["مدير", "refund", "manager"]',
      },
      tonePreset: {
        type: 'string',
        enum: [...VALID_TONE_PRESETS],
        description: 'Tone of the customer-facing agent: formal, casual, playful, or professional.',
      },
      upsellEnabled: {
        type: 'boolean',
        description: 'Whether the agent should proactively suggest add-ons to customers.',
      },
      upsellMaxPerOrder: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Maximum number of upsell suggestions per order (only used when upsellEnabled is true).',
      },
      welcomeMsg: {
        type: 'string',
        description: 'The greeting message sent to customers who first contact the bot.',
      },
    },
    required: [],
  },
};

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleManagerGetAiRules(
  _args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
    select: {
      customInstructions: true,
      escalationKeywords: true,
      tonePreset: true,
      upsellEnabled: true,
      upsellMaxPerOrder: true,
      welcomeMsg: true,
      aiRulesVersion: true,
    },
  });

  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  const keywords = parseEscalationKeywords(settings.escalationKeywords);

  const lines = [
    `**Custom Instructions:** ${settings.customInstructions || '(none)'}`,
    `**Tone Preset:** ${settings.tonePreset}`,
    `**Upsell:** ${settings.upsellEnabled ? `enabled (max ${settings.upsellMaxPerOrder} per order)` : 'disabled'}`,
    `**Escalation Keywords:** ${keywords.length > 0 ? keywords.join(', ') : '(none)'}`,
    `**Welcome Message:** ${settings.welcomeMsg || '(using default)'}`,
    `\n_Rules version: ${settings.aiRulesVersion}_`,
  ];

  return { success: true, result: lines.join('\n') };
}

interface UpdateAiRulesArgs {
  customInstructions?: string;
  escalationKeywords?: string[];
  tonePreset?: string;
  upsellEnabled?: boolean;
  upsellMaxPerOrder?: number;
  welcomeMsg?: string;
}

export async function handleManagerUpdateAiRules(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const {
    customInstructions,
    escalationKeywords,
    tonePreset,
    upsellEnabled,
    upsellMaxPerOrder,
    welcomeMsg,
  } = args as UpdateAiRulesArgs;

  // Validate every supplied field before touching the DB
  if (customInstructions !== undefined) {
    const v = await validateCustomInstructions(customInstructions);
    if (!v.ok) return { success: false, result: `Validation failed: ${v.reason}`, errorCode: 'VALIDATION_ERROR' };
  }

  if (escalationKeywords !== undefined) {
    const v = validateEscalationKeywords(escalationKeywords);
    if (!v.ok) return { success: false, result: `Validation failed: ${v.reason}`, errorCode: 'VALIDATION_ERROR' };
  }

  if (tonePreset !== undefined) {
    const v = validateTonePreset(tonePreset);
    if (!v.ok) return { success: false, result: `Validation failed: ${v.reason}`, errorCode: 'VALIDATION_ERROR' };
  }

  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
  });

  if (!settings) {
    return { success: false, result: 'Restaurant settings not found.', errorCode: 'NOT_FOUND' };
  }

  // Build patch — only include fields that were explicitly provided
  const patch: Record<string, unknown> = {
    aiRulesVersion: { increment: 1 },
  };
  const changed: string[] = [];

  if (customInstructions !== undefined) {
    patch.customInstructions = customInstructions;
    changed.push('customInstructions');
  }
  if (escalationKeywords !== undefined) {
    patch.escalationKeywords = JSON.stringify(escalationKeywords);
    changed.push('escalationKeywords');
  }
  if (tonePreset !== undefined) {
    patch.tonePreset = tonePreset;
    changed.push('tonePreset');
  }
  if (upsellEnabled !== undefined) {
    patch.upsellEnabled = upsellEnabled;
    changed.push('upsellEnabled');
  }
  if (upsellMaxPerOrder !== undefined) {
    patch.upsellMaxPerOrder = upsellMaxPerOrder;
    changed.push('upsellMaxPerOrder');
  }
  if (welcomeMsg !== undefined) {
    patch.welcomeMsg = welcomeMsg;
    changed.push('welcomeMsg');
  }

  if (changed.length === 0) {
    return { success: false, result: 'No fields provided to update.', errorCode: 'NO_OP' };
  }

  await prisma.restaurantSettings.update({
    where: { businessId: ctx.businessId },
    data: patch as any,
  });

  // Bust the customer-agent prompt cache so the change takes effect immediately
  clearSystemPromptCache();

  // Audit trail
  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:ai_rules:update',
    resource: 'RestaurantSettings',
    resourceId: settings.id,
    details: { changed, managerId: ctx.managerId },
  });

  const summary = changed.map((f) => `• ${f}`).join('\n');
  return {
    success: true,
    result: `AI rules updated successfully. Changed fields:\n${summary}\n\nThis action has been logged. Changes are live for all new customer conversations.`,
  };
}
