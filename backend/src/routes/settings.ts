import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  validateCustomInstructions,
  validateEscalationKeywords,
  validateTonePreset,
  type ValidationResult,
} from '../services/ai-rules-validation.js';

const router = Router();

const VALID_AFTER_HOURS_POLICIES = ['collect_order', 'inform_only', 'silence'] as const;
const VALID_CONFIRMATION_STYLES = ['summary', 'itemized', 'minimal'] as const;

// Fields that, when changed, should trigger an aiRulesVersion bump (busts the prompt cache).
const AI_BEHAVIOR_FIELDS = [
  'aiRules',
  'tonePreset',
  'upsellEnabled',
  'upsellMaxPerOrder',
  'customInstructions',
  'escalationKeywords',
] as const;

function rejectIfInvalid(res: Response, result: ValidationResult): boolean {
  if (result.ok) return false;
  res.status(400).json({ error: result.reason, field: result.field });
  return true;
}

// GET /api/settings - Get or create default settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;

    let settings = await prisma.restaurantSettings.findUnique({
      where: { businessId },
    });

    if (!settings) {
      settings = await prisma.restaurantSettings.create({
        data: {
          businessId,
          name: (req as any).business.name,
          openingTime: '09:00',
          closingTime: '23:00',
          welcomeMsg: 'Welcome! How can I help you today?',
          aiRules: '',
          currency: 'SAR',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const {
      name, openingTime, closingTime, welcomeMsg, aiRules, currency,
      address, latitude, longitude, phoneNumber,
      deliveryEnabled, dineInEnabled, pickupEnabled,
      deliveryTiers, maxDeliveryDistanceKm,
      estimatedPrepTimeMinutes, paymentMethods, isTemporarilyClosed, defaultLanguage,
      // AI behavior — Phase 3
      tonePreset, upsellEnabled, upsellMaxPerOrder,
      customInstructions, escalationKeywords,
      // Phase 5 — Operational must-haves
      weeklySchedule, closureExceptions, afterHoursPolicy,
      minOrderValue, maxOrderItemCount, featuredItems, hiddenItems,
      // Phase 6 — UX polish
      logoUrl, coverUrl, mapsUrl, showAddressByName,
      confirmationStyle, cancellationPolicy,
    } = req.body;

    // Validate Phase 3 AI-behavior fields BEFORE any DB write.
    if (rejectIfInvalid(res, validateTonePreset(tonePreset))) return;
    if (rejectIfInvalid(res, validateEscalationKeywords(escalationKeywords))) return;
    if (typeof customInstructions === 'string') {
      if (rejectIfInvalid(res, await validateCustomInstructions(customInstructions))) return;
    }

    // Validate Phase 5 fields.
    if (afterHoursPolicy !== undefined && !VALID_AFTER_HOURS_POLICIES.includes(afterHoursPolicy)) {
      res.status(400).json({ error: `afterHoursPolicy must be one of: ${VALID_AFTER_HOURS_POLICIES.join(', ')}`, field: 'afterHoursPolicy' });
      return;
    }
    if (minOrderValue !== undefined && (typeof minOrderValue !== 'number' || minOrderValue < 0)) {
      res.status(400).json({ error: 'minOrderValue must be >= 0', field: 'minOrderValue' });
      return;
    }
    if (maxOrderItemCount !== undefined && maxOrderItemCount !== null && (typeof maxOrderItemCount !== 'number' || maxOrderItemCount < 1)) {
      res.status(400).json({ error: 'maxOrderItemCount must be null or >= 1', field: 'maxOrderItemCount' });
      return;
    }

    // Validate JSON array fields (Phase 5).
    const jsonArrayFields: Array<{ name: string; value: unknown }> = [
      { name: 'weeklySchedule', value: weeklySchedule },
      { name: 'closureExceptions', value: closureExceptions },
      { name: 'featuredItems', value: featuredItems },
      { name: 'hiddenItems', value: hiddenItems },
    ];
    for (const { name: fieldName, value: fieldValue } of jsonArrayFields) {
      if (fieldValue !== undefined) {
        try {
          const parsed = typeof fieldValue === 'string' ? JSON.parse(fieldValue) : fieldValue;
          if (!Array.isArray(parsed)) throw new Error('not an array');
        } catch {
          res.status(400).json({ error: `${fieldName} must be a valid JSON array`, field: fieldName });
          return;
        }
      }
    }

    // Validate Phase 6 fields.
    if (confirmationStyle !== undefined && !VALID_CONFIRMATION_STYLES.includes(confirmationStyle)) {
      res.status(400).json({ error: `confirmationStyle must be one of: ${VALID_CONFIRMATION_STYLES.join(', ')}`, field: 'confirmationStyle' });
      return;
    }
    if (cancellationPolicy !== undefined && typeof cancellationPolicy === 'string' && cancellationPolicy.length > 1000) {
      res.status(400).json({ error: 'cancellationPolicy must be 1000 characters or fewer', field: 'cancellationPolicy' });
      return;
    }
    const urlFields: Array<{ name: string; value: unknown }> = [
      { name: 'logoUrl', value: logoUrl },
      { name: 'coverUrl', value: coverUrl },
      { name: 'mapsUrl', value: mapsUrl },
    ];
    for (const { name: urlFieldName, value: urlValue } of urlFields) {
      if (urlValue !== null && urlValue !== undefined && typeof urlValue === 'string' && urlValue !== '' && !urlValue.startsWith('https://')) {
        res.status(400).json({ error: `${urlFieldName} must be a valid HTTPS URL`, field: urlFieldName });
        return;
      }
    }

    // Normalize Phase 5 JSON fields for storage.
    const normalizeJsonArray = (v: unknown): string | undefined => {
      if (v === undefined) return undefined;
      return typeof v === 'string' ? v : JSON.stringify(v);
    };
    const weeklyScheduleStr = normalizeJsonArray(weeklySchedule);
    const closureExceptionsStr = normalizeJsonArray(closureExceptions);
    const featuredItemsStr = normalizeJsonArray(featuredItems);
    const hiddenItemsStr = normalizeJsonArray(hiddenItems);

    // Normalize escalationKeywords to JSON string for storage.
    let escalationKeywordsStr: string | undefined;
    if (escalationKeywords !== undefined) {
      escalationKeywordsStr = typeof escalationKeywords === 'string'
        ? escalationKeywords
        : JSON.stringify(escalationKeywords);
    }

    const aiBehaviorChanged = AI_BEHAVIOR_FIELDS.some((f) => req.body[f] !== undefined);

    // Read current version so we can increment it atomically inside the upsert.
    const existing = await prisma.restaurantSettings.findUnique({
      where: { businessId },
      select: { aiRulesVersion: true },
    });
    const nextAiRulesVersion = aiBehaviorChanged ? (existing?.aiRulesVersion ?? 0) + 1 : undefined;

    const settings = await prisma.restaurantSettings.upsert({
      where: { businessId },
      update: {
        name, openingTime, closingTime, welcomeMsg, aiRules, currency,
        address, latitude, longitude, phoneNumber,
        deliveryEnabled, dineInEnabled, pickupEnabled,
        deliveryTiers,
        maxDeliveryDistanceKm: maxDeliveryDistanceKm != null ? Number(maxDeliveryDistanceKm) : undefined,
        estimatedPrepTimeMinutes: estimatedPrepTimeMinutes != null ? Number(estimatedPrepTimeMinutes) : undefined,
        paymentMethods,
        isTemporarilyClosed,
        defaultLanguage,
        tonePreset,
        upsellEnabled,
        upsellMaxPerOrder: upsellMaxPerOrder != null ? Number(upsellMaxPerOrder) : undefined,
        customInstructions,
        escalationKeywords: escalationKeywordsStr,
        ...(nextAiRulesVersion !== undefined ? { aiRulesVersion: nextAiRulesVersion } : {}),
        // Phase 5
        weeklySchedule: weeklyScheduleStr,
        closureExceptions: closureExceptionsStr,
        afterHoursPolicy,
        minOrderValue: minOrderValue != null ? Number(minOrderValue) : undefined,
        maxOrderItemCount: maxOrderItemCount != null ? Number(maxOrderItemCount) : (maxOrderItemCount === null ? null : undefined),
        featuredItems: featuredItemsStr,
        hiddenItems: hiddenItemsStr,
        // Phase 6
        logoUrl: logoUrl !== undefined ? (logoUrl || null) : undefined,
        coverUrl: coverUrl !== undefined ? (coverUrl || null) : undefined,
        mapsUrl: mapsUrl !== undefined ? (mapsUrl || null) : undefined,
        showAddressByName,
        confirmationStyle,
        cancellationPolicy,
      },
      create: {
        businessId,
        name: name || (req as any).business.name,
        openingTime: openingTime || '09:00',
        closingTime: closingTime || '23:00',
        welcomeMsg: welcomeMsg || 'Welcome! How can I help you today?',
        aiRules: aiRules || '',
        currency: currency || 'SAR',
        address, latitude, longitude, phoneNumber,
        deliveryEnabled: deliveryEnabled ?? false,
        dineInEnabled: dineInEnabled ?? true,
        pickupEnabled: pickupEnabled ?? true,
        deliveryTiers,
        maxDeliveryDistanceKm: maxDeliveryDistanceKm != null ? Number(maxDeliveryDistanceKm) : undefined,
        estimatedPrepTimeMinutes: estimatedPrepTimeMinutes != null ? Number(estimatedPrepTimeMinutes) : undefined,
        paymentMethods: paymentMethods || '["cash","card"]',
        isTemporarilyClosed: isTemporarilyClosed ?? false,
        defaultLanguage: defaultLanguage || 'en',
        tonePreset: tonePreset || 'casual',
        upsellEnabled: upsellEnabled ?? false,
        upsellMaxPerOrder: upsellMaxPerOrder != null ? Number(upsellMaxPerOrder) : 1,
        customInstructions: customInstructions || '',
        escalationKeywords: escalationKeywordsStr || '[]',
        // Phase 5
        weeklySchedule: weeklyScheduleStr || '[]',
        closureExceptions: closureExceptionsStr || '[]',
        afterHoursPolicy: afterHoursPolicy || 'inform_only',
        minOrderValue: minOrderValue != null ? Number(minOrderValue) : 0,
        maxOrderItemCount: maxOrderItemCount != null ? Number(maxOrderItemCount) : undefined,
        featuredItems: featuredItemsStr || '[]',
        hiddenItems: hiddenItemsStr || '[]',
        // Phase 6
        logoUrl: logoUrl || null,
        coverUrl: coverUrl || null,
        mapsUrl: mapsUrl || null,
        showAddressByName: showAddressByName ?? false,
        confirmationStyle: confirmationStyle || 'summary',
        cancellationPolicy: cancellationPolicy || '',
      },
    });

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
