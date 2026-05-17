import { prisma } from '../../lib/prisma.js';

export interface DeliveryTierInfo {
  maxKm: number;
  fee: number;
}

export interface MenuItemInfo {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  basePrice: number | null;
  categoryName: string;
  categoryNameAr: string | null;
  options: { id: string; name: string; price: number }[];
}

export interface RestaurantContext {
  restaurantName: string;
  currency: string;
  openingTime: string;
  closingTime: string;
  aiRules: string;
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

  const menuItems: MenuItemInfo[] = (menuItemsRaw || []).map(item => ({
    id: item.id,
    name: item.name,
    nameAr: item.nameAr,
    description: item.description,
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

  return {
    restaurantName: settings?.name || business?.name || 'the restaurant',
    currency: settings?.currency || 'SAR',
    openingTime,
    closingTime,
    aiRules: settings?.aiRules || '',
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
  };
}
