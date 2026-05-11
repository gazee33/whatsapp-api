export interface MenuMatchItem {
  id: string;
  name: string;
  nameAr: string | null;
  price: number;
}

export interface MenuMatchOption {
  id: string;
  name: string;
  price: number;
}

function normalizeArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(itemName: string, menuName: string): boolean {
  if (!itemName) return false;

  const a = normalizeArabic(itemName);
  const b = normalizeArabic(menuName);

  if (!a || !b) return false;

  if (a === b) return true;

  if (a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(/\s+/).filter(Boolean);
  const wordsB = b.split(/\s+/).filter(Boolean);
  const overlap = wordsA.filter((w) => wordsB.some((wb) => wb.includes(w) || w.includes(wb)));

  return overlap.length > 0;
}

function stripParenthetical(s: string): string {
  return s
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findBestMatch(
  itemName: string,
  menuItems: MenuMatchItem[]
): MenuMatchItem | undefined {
  const cleanedItem = stripParenthetical(itemName);

  const exact = menuItems.find(
    (mi) => mi.name === cleanedItem || mi.name === itemName || mi.nameAr === cleanedItem || mi.nameAr === itemName
  );
  if (exact) return exact;

  for (const mi of menuItems) {
    if (fuzzyMatch(cleanedItem, mi.name)) return mi;
    if (fuzzyMatch(itemName, mi.name)) return mi;
    if (mi.nameAr && fuzzyMatch(cleanedItem, mi.nameAr)) return mi;
    if (mi.nameAr && fuzzyMatch(itemName, mi.nameAr)) return mi;
  }

  return undefined;
}

export function findOption(
  optionName: string,
  options: MenuMatchOption[]
): MenuMatchOption | undefined {
  if (!options || options.length === 0) return undefined;

  const cleanedOptionName = stripParenthetical(optionName);
  const normalizedInput = normalizeArabic(cleanedOptionName);

  for (const opt of options) {
    if (opt.name === cleanedOptionName || opt.name === optionName) {
      return opt;
    }
  }

  for (const opt of options) {
    const normalizedOpt = normalizeArabic(opt.name);
    if (normalizedOpt === normalizedInput) return opt;
    if (normalizedOpt.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedOpt)) return opt;
  }

  return undefined;
}

export function getAvailableOptions(options: MenuMatchOption[]): string {
  if (!options || options.length === 0) return '';

  return options.map((opt) => {
    const priceStr = opt.price > 0 ? ` (+${opt.price.toFixed(2)})` : '';
    return `${opt.name}${priceStr}`;
  }).join(', ');
}
