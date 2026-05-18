import { prisma } from '../../lib/prisma.js';
import { parseEscalationKeywords } from '../ai-rules-validation.js';

export interface DeliveryTierInfo {
  maxKm: number;
  fee: number;
}

export interface MenuItemInfo {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  allergens: string | null;
  basePrice: number | null;
  categoryName: string;
  categoryNameAr: string | null;
  options: { id: string; name: string; price: number }[];
}

export interface DaySchedule {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

export interface RestaurantContext {
  restaurantName: string;
  currency: string;
  openingTime: string;
  closingTime: string;
  aiRules: string;
  // AI Behavior — Phase 3 structured fields
  tonePreset: string;
  upsellEnabled: boolean;
  upsellMaxPerOrder: number;
  customInstructions: string;
  escalationKeywords: string[];
  aiRulesVersion: number;
  defaultLanguage: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  deliveryEnabled: boolean;
  dineInEnabled: boolean;
  pickupEnabled: boolean;
  estimatedPrepTimeMinutes: number | null;
  paymentMethods: string[];
  isTemporarilyClosed: boolean;
  deliveryTiers: DeliveryTierInfo[];
  maxDeliveryDistanceKm: number | null;
  menuItems: MenuItemInfo[];
  isCurrentlyOpen: boolean;
  currentTime: string;
  // Phase 5 — Operational must-haves
  weeklySchedule: DaySchedule[];
  closureExceptions: string[];
  afterHoursPolicy: string;
  minOrderValue: number;
  maxOrderItemCount: number | null;
  featuredItems: string[];
  hiddenItems: string[];
  // Phase 6 — UX polish
  logoUrl: string | null;
  coverUrl: string | null;
  mapsUrl: string | null;
  showAddressByName: boolean;
  confirmationStyle: string;
  cancellationPolicy: string;
}

/**
 * Check if the current server time falls within operating hours.
 * Handles cross-midnight hours (e.g., 20:00-02:00).
 */
export function computeIsCurrentlyOpen(openingTime: string, closingTime: string): boolean {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();

  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;

  if (close <= open) {
    return cur >= open || cur < close;
  }
  return cur >= open && cur < close;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export async function getRestaurantContext(businessId: string): Promise<RestaurantContext> {
  const [settings, business, menuItemsRaw] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { businessId } }),
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.menuItem.findMany({
      where: { category: { businessId }, available: true },
      include: { category: true, options: true },
    }),
  ]);

  let paymentMethods: string[] = ['cash', 'card'];
  if (settings?.paymentMethods) {
    try {
      paymentMethods = JSON.parse(settings.paymentMethods);
    } catch {}
  }

  let deliveryTiers: DeliveryTierInfo[] = [];
  if (settings?.deliveryTiers) {
    try {
      deliveryTiers = JSON.parse(settings.deliveryTiers);
    } catch {}
  }

  let weeklySchedule: DaySchedule[] = [];
  if (settings?.weeklySchedule) {
    try {
      weeklySchedule = JSON.parse(settings.weeklySchedule);
    } catch {}
  }

  let closureExceptions: string[] = [];
  if (settings?.closureExceptions) {
    try {
      closureExceptions = JSON.parse(settings.closureExceptions);
    } catch {}
  }

  let featuredItems: string[] = [];
  if (settings?.featuredItems) {
    try {
      featuredItems = JSON.parse(settings.featuredItems);
    } catch {}
  }

  let hiddenItems: string[] = [];
  if (settings?.hiddenItems) {
    try {
      hiddenItems = JSON.parse(settings.hiddenItems);
    } catch {}
  }

  const menuItems: MenuItemInfo[] = (menuItemsRaw || []).map(item => ({
    id: item.id,
    name: item.name,
    nameAr: item.nameAr,
    description: item.description,
    allergens: item.allergens ?? null,
    basePrice: item.basePrice,
    categoryName: item.category.name,
    categoryNameAr: item.category.nameAr,
    options: item.options.map(opt => ({
      id: opt.id,
      name: opt.name,
      price: opt.price,
    })),
  }));

  const openingTime = settings?.openingTime || '09:00';
  const closingTime = settings?.closingTime || '23:00';
  const isTemporarilyClosed = settings?.isTemporarilyClosed ?? false;

  // Backfill: when `customInstructions` hasn't been set yet but the legacy `aiRules` has content,
  // fall back to `aiRules` so existing tenants keep their behavior without re-saving.
  const rawCustomInstructions = settings?.customInstructions || '';
  const customInstructions = rawCustomInstructions.trim().length > 0
    ? rawCustomInstructions
    : (settings?.aiRules || '');

  return {
    restaurantName: settings?.name || business?.name || 'the restaurant',
    currency: settings?.currency || 'SAR',
    openingTime,
    closingTime,
    aiRules: settings?.aiRules || '',
    tonePreset: settings?.tonePreset || 'casual',
    upsellEnabled: settings?.upsellEnabled ?? false,
    upsellMaxPerOrder: settings?.upsellMaxPerOrder ?? 1,
    customInstructions,
    escalationKeywords: parseEscalationKeywords(settings?.escalationKeywords || '[]'),
    aiRulesVersion: settings?.aiRulesVersion ?? 1,
    defaultLanguage: settings?.defaultLanguage || 'en',
    address: settings?.address || null,
    latitude: settings?.latitude || null,
    longitude: settings?.longitude || null,
    phoneNumber: settings?.phoneNumber || null,
    deliveryEnabled: settings?.deliveryEnabled ?? false,
    dineInEnabled: settings?.dineInEnabled ?? true,
    pickupEnabled: settings?.pickupEnabled ?? true,
    estimatedPrepTimeMinutes: settings?.estimatedPrepTimeMinutes || null,
    paymentMethods,
    isTemporarilyClosed,
    deliveryTiers,
    maxDeliveryDistanceKm: settings?.maxDeliveryDistanceKm || null,
    menuItems,
    isCurrentlyOpen: isTemporarilyClosed ? false : computeIsCurrentlyOpen(openingTime, closingTime),
    currentTime: getCurrentTimeString(),
    // Phase 5
    weeklySchedule,
    closureExceptions,
    afterHoursPolicy: settings?.afterHoursPolicy || 'inform_only',
    minOrderValue: settings?.minOrderValue ?? 0,
    maxOrderItemCount: settings?.maxOrderItemCount ?? null,
    featuredItems,
    hiddenItems,
    // Phase 6
    logoUrl: settings?.logoUrl || null,
    coverUrl: settings?.coverUrl || null,
    mapsUrl: settings?.mapsUrl || null,
    showAddressByName: settings?.showAddressByName ?? false,
    confirmationStyle: settings?.confirmationStyle || 'summary',
    cancellationPolicy: settings?.cancellationPolicy || '',
  };
}
