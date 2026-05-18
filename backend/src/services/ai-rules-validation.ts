import { getPlatformConfig } from './platform-config.js';

export type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; reason: string };

const MAX_ESCALATION_KEYWORDS = 20;
const MAX_ESCALATION_KEYWORD_LENGTH = 50;
export const VALID_TONE_PRESETS = ['formal', 'casual', 'playful', 'professional'] as const;
export type TonePreset = (typeof VALID_TONE_PRESETS)[number];

/**
 * Check text against the platform's globalForbiddenWords list (case-insensitive whole-word match).
 * This is a synchronous helper — callers pass the word list they already loaded.
 */
export function validateAgainstGlobalForbiddenWords(
  text: string,
  globalForbiddenWords: string[],
): ValidationResult {
  const lower = text.toLowerCase();
  for (const word of globalForbiddenWords) {
    if (typeof word !== 'string' || !word) continue;
    if (lower.includes(word.toLowerCase())) {
      return {
        ok: false,
        field: 'customInstructions',
        reason: `Contains a globally forbidden word: "${word}".`,
      };
    }
  }
  return { ok: true };
}

export async function validateCustomInstructions(text: string): Promise<ValidationResult> {
  const config = await getPlatformConfig();
  const maxLen = config.maxCustomRuleLength ?? 500;

  if (text.length > maxLen) {
    return {
      ok: false,
      field: 'customInstructions',
      reason: `Length ${text.length} exceeds the platform maximum of ${maxLen} characters.`,
    };
  }

  let patterns: unknown;
  try {
    patterns = JSON.parse(config.forbiddenPatterns ?? '[]');
  } catch {
    patterns = [];
  }

  if (!Array.isArray(patterns)) return { ok: true };

  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || !pattern) continue;
    let re: RegExp;
    try {
      re = new RegExp(pattern, 'i');
    } catch {
      continue;
    }
    if (re.test(text)) {
      return {
        ok: false,
        field: 'customInstructions',
        reason: `Conflicts with a platform safety rule (matched forbidden pattern: "${pattern}").`,
      };
    }
  }

  // Check against global forbidden words
  let globalWords: string[] = [];
  try {
    const parsed = JSON.parse(config.globalForbiddenWords ?? '[]');
    if (Array.isArray(parsed)) globalWords = parsed.filter((w): w is string => typeof w === 'string');
  } catch {
    // ignore parse errors
  }

  return validateAgainstGlobalForbiddenWords(text, globalWords);
}

export function validateEscalationKeywords(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) return { ok: true };

  let arr: unknown = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return { ok: false, field: 'escalationKeywords', reason: 'Must be a JSON array of strings.' };
    }
  }

  if (!Array.isArray(arr)) {
    return { ok: false, field: 'escalationKeywords', reason: 'Must be an array of strings.' };
  }
  if (arr.length > MAX_ESCALATION_KEYWORDS) {
    return {
      ok: false,
      field: 'escalationKeywords',
      reason: `Maximum ${MAX_ESCALATION_KEYWORDS} escalation keywords.`,
    };
  }
  for (const k of arr) {
    if (typeof k !== 'string') {
      return {
        ok: false,
        field: 'escalationKeywords',
        reason: 'All escalation keywords must be strings.',
      };
    }
    if (k.length > MAX_ESCALATION_KEYWORD_LENGTH) {
      return {
        ok: false,
        field: 'escalationKeywords',
        reason: `Escalation keyword too long (max ${MAX_ESCALATION_KEYWORD_LENGTH} chars): "${k.slice(0, 30)}…".`,
      };
    }
  }

  return { ok: true };
}

export function validateTonePreset(value: unknown): ValidationResult {
  if (value === undefined || value === null) return { ok: true };
  if (typeof value !== 'string' || !(VALID_TONE_PRESETS as readonly string[]).includes(value)) {
    return {
      ok: false,
      field: 'tonePreset',
      reason: `Must be one of: ${VALID_TONE_PRESETS.join(', ')}.`,
    };
  }
  return { ok: true };
}

export function parseEscalationKeywords(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter((k) => typeof k === 'string');
  } catch {}
  return [];
}
