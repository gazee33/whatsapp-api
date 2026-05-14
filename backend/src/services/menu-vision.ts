import { createLLMProvider } from '../llm/factory.js';
import type { ChatMessage } from '../llm/types.js';
import { config } from '../config.js';

export interface ExtractedMenuOption {
  name: string;
  price: number;
}

export interface ExtractedMenuItem {
  name: string;
  nameAr?: string | null;
  description?: string | null;
  basePrice: number | null;
  options: ExtractedMenuOption[];
}

export interface ExtractedMenuCategory {
  name: string;
  nameAr?: string | null;
  items: ExtractedMenuItem[];
}

export interface ExtractedMenu {
  categories: ExtractedMenuCategory[];
}

const SYSTEM_PROMPT = `Analyze this food menu image carefully and extract ALL the information.

You are extracting a restaurant menu. Identify every section (category) and every item.

Return ONLY valid JSON matching this exact structure:
{
  "categories": [{
    "name": "Category name in English (or transliterated if only Arabic)",
    "nameAr": "Category name in Arabic if present on the menu, otherwise null",
    "items": [{
      "name": "Item name in English (or transliterated if only Arabic)",
      "nameAr": "Arabic item name if present on the menu, otherwise null",
      "description": "Item description if visible, otherwise null",
      "basePrice": null,
      "options": [{
        "name": "Option name (e.g. Large, Extra cheese)",
        "price": 0.00
      }]
    }]
  }]
}

Important rules:
- Extract EVERY item and category visible in the image. Do not skip anything.
- Prices are numbers. If a price is unclear or not visible, use 0.
- If no options exist for an item, return an empty array [].
- Handle both English and Arabic text. Include both when possible.
- If an item has no description, set description to null.
- Do NOT include items that are not actually on the menu image.
- Use the actual currency values shown. Do not convert.

Respond with ONLY the JSON object. No markdown, no backticks, no explanation text.`;

function sanitizeCategories(raw: unknown): ExtractedMenuCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((cat: Record<string, unknown>) => {
    const items = Array.isArray(cat.items)
      ? cat.items.map((item: Record<string, unknown>) => ({
          name: typeof item.name === 'string' ? item.name : '',
          nameAr: typeof item.nameAr === 'string' ? item.nameAr : null,
          description: typeof item.description === 'string' ? item.description : null,
          basePrice: typeof item.basePrice === 'number' ? item.basePrice : typeof item.price === 'number' ? item.price : null,
          options: Array.isArray(item.options)
            ? item.options.map((opt: Record<string, unknown>) => ({
                name: typeof opt.name === 'string' ? opt.name : '',
                price: typeof opt.price === 'number' ? opt.price : 0,
              }))
            : [],
        }))
      : [];
    return {
      name: typeof cat.name === 'string' ? cat.name : '',
      nameAr: typeof cat.nameAr === 'string' ? cat.nameAr : null,
      items,
    };
  });
}

export async function analyzeMenuImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractedMenu> {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Menu image analysis requires an OpenAI API key.');
  }

  const llm = await createLLMProvider('openai', 'gpt-4o');

  const base64Data = imageBuffer.toString('base64');

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: SYSTEM_PROMPT,
      imageData: { data: base64Data, mimeType },
    },
  ];

  const response = await llm.chat(messages, []);

  if (!response.content) {
    throw new Error('No content returned from AI vision model');
  }

  let parsed: Record<string, unknown>;

  try {
    const trimmed = response.content.trim();
    parsed = JSON.parse(trimmed);
  } catch {
    const cleaned = response.content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch (innerErr) {
      throw new Error(
        `Failed to parse AI vision response as JSON. Raw: ${response.content.slice(0, 500)}`
      );
    }
  }

  if (!parsed || typeof parsed.categories === 'undefined') {
    throw new Error('AI vision response missing categories array');
  }

  return {
    categories: sanitizeCategories(parsed.categories),
  };
}
