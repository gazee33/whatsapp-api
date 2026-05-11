import { prisma } from '../lib/prisma.js';

export interface CheckRestaurantInfoParams {
  topic?: 'address' | 'hours' | 'payment' | 'delivery' | 'all';
}

export async function handleCheckRestaurantInfo(
  businessId: string,
  params: CheckRestaurantInfoParams
): Promise<string> {
  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId },
  });

  if (!settings) {
    return 'Restaurant settings not configured.';
  }

  const topic = params.topic || 'all';
  const lines: string[] = [];

  const orderTypes: string[] = [];
  if (settings.deliveryEnabled) orderTypes.push('delivery');
  if (settings.dineInEnabled) orderTypes.push('dine-in');
  if (settings.pickupEnabled) orderTypes.push('pickup');

  if (topic === 'address' || topic === 'all') {
    if (settings.address) {
      let addr = `📍 Address: ${settings.address}`;
      if (settings.latitude && settings.longitude) {
        addr += `\n📍 Map: https://www.google.com/maps?q=${settings.latitude},${settings.longitude}`;
      }
      lines.push(addr);
    }
    if (settings.phoneNumber) {
      lines.push(`📞 Phone: ${settings.phoneNumber}`);
    }
  }

  if (topic === 'hours' || topic === 'all') {
    if (settings.isTemporarilyClosed) {
      lines.push('🕐 Status: Temporarily closed');
    } else {
      lines.push(
        `🕐 Hours: ${settings.openingTime} - ${settings.closingTime}`
      );
    }
  }

  if (topic === 'payment' || topic === 'all') {
    try {
      const methods = JSON.parse(settings.paymentMethods);
      lines.push(`💳 Payment: ${methods.join(', ')}`);
    } catch {
      lines.push('💳 Payment: cash, card');
    }
  }

  if (topic === 'delivery' || topic === 'all') {
    if (settings.deliveryEnabled) {
      let deliveryInfo = '🚚 Delivery: Available\n';
      if (settings.deliveryTiers) {
        try {
          const tiers = JSON.parse(settings.deliveryTiers);
          if (Array.isArray(tiers) && tiers.length > 0) {
            deliveryInfo += 'Delivery fees (distance-based):\n';
            for (const tier of tiers) {
              deliveryInfo += `- Up to ${tier.maxKm} km: ${tier.fee.toFixed(2)}\n`;
            }
          }
        } catch {}
      }
      if (settings.maxDeliveryDistanceKm) {
        deliveryInfo += `Max delivery distance: ${settings.maxDeliveryDistanceKm} km`;
      }
      lines.push(deliveryInfo.trim());
    }
  }

  if (topic === 'all') {
    if (orderTypes.length > 0) {
      lines.push(`\nOrder types: ${orderTypes.join(', ')}`);
    }
    if (settings.estimatedPrepTimeMinutes) {
      lines.push(
        `⏱️ Estimated prep time: ~${settings.estimatedPrepTimeMinutes} min`
      );
    }
  }

  if (lines.length === 0) {
    return 'No information available for the requested topic.';
  }

  return lines.join('\n');
}
