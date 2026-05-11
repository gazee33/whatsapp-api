import { prisma } from '../lib/prisma.js';

export interface QueryMenuParams {
  query?: string;
  category?: string;
}

// In-memory cache for menu queries
interface CacheEntry {
  data: string;
  expires: number;
}

const menuCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(businessId: string, category?: string, query?: string): string {
  return `${businessId}:${category || 'all'}:${query || 'all'}`;
}

function getCachedResult(key: string): string | undefined {
  const entry = menuCache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  if (entry) {
    menuCache.delete(key);
  }
  return undefined;
}

function setCachedResult(key: string, data: string): void {
  menuCache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

export async function handleQueryMenu(
  businessId: string,
  params: QueryMenuParams
): Promise<string> {
  const { query, category } = params;

  // Check cache first
  const cacheKey = getCacheKey(businessId, category, query);
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Build where clause
  const where: any = {
    category: {
      businessId,
    },
    available: true,
  };

  // Filter by category if provided
  if (category) {
    where.category = {
      ...where.category,
      name: {
        contains: category,
      },
    };
  }

  // Get menu items
  const menuItems = await prisma.menuItem.findMany({
    where,
    include: {
      category: true,
      options: true,
    },
  });

  // Filter by query keyword if provided (post-filter for name search)
  let filteredItems = menuItems;
  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredItems = menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.nameAr && item.nameAr.includes(query)) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery))
    );
  }

  if (filteredItems.length === 0) {
    return 'No menu items found matching your criteria.';
  }

  // Group by category
  const grouped: Record<string, typeof filteredItems> = {};
  for (const item of filteredItems) {
    const catName = item.category.name;
    if (!grouped[catName]) {
      grouped[catName] = [];
    }
    grouped[catName].push(item);
  }

  // Format results
  const lines: string[] = [];
  for (const [catName, items] of Object.entries(grouped)) {
    lines.push(`\n## ${catName}`);
    for (const item of items) {
      const price = (item.basePrice ?? 0).toFixed(2);
      let line = `- ${item.name}`;
      if (item.nameAr) {
        line += ` (${item.nameAr})`;
      }
      line += `: ${price} SAR`;
      if (item.description) {
        line += ` - ${item.description}`;
      }
      lines.push(line);

      // Add options if present
      if (item.options && item.options.length > 0) {
        const optionParts = item.options.map((opt) => {
          const priceStr = opt.price > 0 ? `+${opt.price.toFixed(2)}` : '0.00';
          return `${opt.name} (${priceStr})`;
        });
        lines.push(`  🔹 Options: ${optionParts.join(', ')}`);
      }
    }
  }

  const result = lines.join('\n');

  // Cache the result
  setCachedResult(cacheKey, result);

  return result;
}
