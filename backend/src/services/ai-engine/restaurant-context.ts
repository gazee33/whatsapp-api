import { prisma } from '../../lib/prisma.js';

export interface RestaurantContext {
  restaurantName: string;
  currency: string;
  openingTime: string;
  closingTime: string;
  aiRules: string;
  address: string | null;
  phoneNumber: string | null;
  deliveryEnabled: boolean;
  dineInEnabled: boolean;
  pickupEnabled: boolean;
  estimatedPrepTimeMinutes: number | null;
  paymentMethods: string[];
  isTemporarilyClosed: boolean;
}

export async function getRestaurantContext(businessId: string): Promise<RestaurantContext> {
  const [settings, business] = await Promise.all([
    prisma.restaurantSettings.findUnique({ where: { businessId } }),
    prisma.business.findUnique({ where: { id: businessId } }),
  ]);

  let paymentMethods: string[] = ['cash', 'card'];
  if (settings?.paymentMethods) {
    try {
      paymentMethods = JSON.parse(settings.paymentMethods);
    } catch {}
  }

  return {
    restaurantName: settings?.name || business?.name || 'the restaurant',
    currency: settings?.currency || 'SAR',
    openingTime: settings?.openingTime || '09:00',
    closingTime: settings?.closingTime || '23:00',
    aiRules: settings?.aiRules || '',
    address: settings?.address || null,
    phoneNumber: settings?.phoneNumber || null,
    deliveryEnabled: settings?.deliveryEnabled ?? false,
    dineInEnabled: settings?.dineInEnabled ?? true,
    pickupEnabled: settings?.pickupEnabled ?? true,
    estimatedPrepTimeMinutes: settings?.estimatedPrepTimeMinutes || null,
    paymentMethods,
    isTemporarilyClosed: settings?.isTemporarilyClosed ?? false,
  };
}
