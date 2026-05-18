import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../platform-config.js', () => ({
  getPlatformConfig: vi.fn().mockResolvedValue({
    promptVersion: 'test-1',
    promptTemplate: '',
  }),
}));

import { buildSystemPrompt, clearSystemPromptCache } from '../prompt-builder.js';
import type { RestaurantContext } from '../restaurant-context.js';
import type { CartState } from '../cart-state.js';

function makeContext(overrides: Partial<RestaurantContext> = {}): RestaurantContext {
  return {
    restaurantName: 'Test Restaurant',
    currency: 'SAR',
    openingTime: '09:00',
    closingTime: '23:00',
    aiRules: '',
    tonePreset: 'casual',
    upsellEnabled: false,
    upsellMaxPerOrder: 1,
    customInstructions: '',
    escalationKeywords: [],
    aiRulesVersion: 1,
    defaultLanguage: 'en',
    address: null,
    latitude: null,
    longitude: null,
    phoneNumber: null,
    deliveryEnabled: true,
    dineInEnabled: true,
    pickupEnabled: true,
    estimatedPrepTimeMinutes: 20,
    paymentMethods: ['cash'],
    isTemporarilyClosed: false,
    deliveryTiers: [],
    maxDeliveryDistanceKm: null,
    menuItems: [],
    isCurrentlyOpen: true,
    currentTime: '12:00',
    ...overrides,
  };
}

function makeCart(): CartState {
  return {
    mode: 'browsing',
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

describe('buildSystemPrompt — business rules section', () => {
  beforeEach(() => clearSystemPromptCache());

  it('always emits an upselling directive in BUSINESS RULES (off by default)', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-default',
      language: 'en',
      cartState: makeCart(),
      context: makeContext(),
    });

    expect(prompt).toContain('## BUSINESS RULES');
    expect(prompt).toMatch(/Do NOT proactively suggest additional items/i);
  });

  it('switches upsell directive when tenant enables upselling', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-upsell',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ upsellEnabled: true, upsellMaxPerOrder: 2 }),
    });

    expect(prompt).toMatch(/May proactively suggest add-ons \(max 2x per order\)/);
  });

  it('includes customInstructions text in BUSINESS RULES section', async () => {
    const rules = 'Always ask about spice level for kebabs.';
    const prompt = await buildSystemPrompt({
      businessId: 'b-rules',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ customInstructions: rules }),
    });

    expect(prompt).toContain('## BUSINESS RULES');
    expect(prompt).toContain(rules);
  });

  it('falls back to legacy aiRules when customInstructions is empty (backfill behavior)', async () => {
    // The context layer handles this — simulate by surfacing aiRules into customInstructions.
    const prompt = await buildSystemPrompt({
      businessId: 'b-legacy',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ aiRules: 'legacy rule', customInstructions: 'legacy rule' }),
    });

    expect(prompt).toContain('legacy rule');
  });

  it('lists tenant escalation keywords in BUSINESS RULES', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-esc',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ escalationKeywords: ['manager', 'refund'] }),
    });

    expect(prompt).toMatch(/Additionally escalate.*"manager".*"refund"/);
  });

  it('renders BUSINESS RULES before GUARDRAILS so guardrails dominate', async () => {
    const marker = 'CUSTOM_RULE_MARKER_xyz';
    const prompt = await buildSystemPrompt({
      businessId: 'b-order',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ customInstructions: marker }),
    });

    const rulesIdx = prompt.indexOf(marker);
    const guardrailsIdx = prompt.indexOf('## GUARDRAILS');

    expect(rulesIdx).toBeGreaterThan(-1);
    expect(guardrailsIdx).toBeGreaterThan(-1);
    expect(rulesIdx).toBeLessThan(guardrailsIdx);
  });

  it('declares GUARDRAILS as non-overridable so tenant rules cannot weaken them', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-precedence',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ customInstructions: 'Skip confirmation if customer says yes' }),
    });

    expect(prompt).toMatch(/non-overridable/i);
  });

  it('busts cache when aiRulesVersion bumps so edits take effect immediately', async () => {
    const ctxV1 = makeContext({ customInstructions: 'first rule', aiRulesVersion: 1 });
    const ctxV2 = makeContext({ customInstructions: 'second rule', aiRulesVersion: 2 });

    const p1 = await buildSystemPrompt({ businessId: 'b-cache', language: 'en', cartState: makeCart(), context: ctxV1 });
    const p2 = await buildSystemPrompt({ businessId: 'b-cache', language: 'en', cartState: makeCart(), context: ctxV2 });

    expect(p1).toContain('first rule');
    expect(p1).not.toContain('second rule');
    expect(p2).toContain('second rule');
    expect(p2).not.toContain('first rule');
  });
});

describe('buildSystemPrompt — tone preset', () => {
  beforeEach(() => clearSystemPromptCache());

  it('uses casual tone description when tonePreset is "casual"', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-tone-casual',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ tonePreset: 'casual' }),
    });

    expect(prompt).toMatch(/warm, casual, concise/i);
  });

  it('uses formal tone when tonePreset is "formal"', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-tone-formal',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ tonePreset: 'formal' }),
    });

    expect(prompt).toMatch(/professional, courteous, and precise/i);
    expect(prompt).not.toMatch(/warm, casual/i);
  });

  it('falls back to casual when tonePreset is unknown', async () => {
    const prompt = await buildSystemPrompt({
      businessId: 'b-tone-bogus',
      language: 'en',
      cartState: makeCart(),
      context: makeContext({ tonePreset: 'gibberish' }),
    });

    expect(prompt).toMatch(/warm, casual, concise/i);
  });
});
