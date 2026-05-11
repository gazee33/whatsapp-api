import { prisma } from '../lib/prisma.js';
import { reverseGeocode, forwardGeocode, getDistanceKm, calculateDeliveryFee } from '../services/google-maps.js';
import type { CartState } from '../services/ai-engine/cart-state.js';

export interface SetDeliveryAddressParams {
  latitude?: number;
  longitude?: number;
  address?: string;
  notes?: string;
  contactPhone?: string;
}

type SetDeliveryAddressResult =
  | { success: true; result: string; cartState: CartState }
  | { success: false; result: string; cartState: null };

export async function handleSetDeliveryAddress(
  businessId: string,
  customerId: string,
  params: SetDeliveryAddressParams
): Promise<SetDeliveryAddressResult> {
  const { latitude, longitude, address, notes, contactPhone } = params;

  if (!latitude && !longitude && !address) {
    return { success: false, result: 'Please provide either your location (latitude + longitude) when sharing on WhatsApp, or type your delivery address.', cartState: null };
  }

  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId },
  });

  if (!settings) {
    return { success: false, result: 'Restaurant settings not configured.', cartState: null };
  }

  if (!settings.latitude || !settings.longitude) {
    return { success: false, result: 'Restaurant location is not configured. Please contact the restaurant to set up their location.', cartState: null };
  }

  let resolvedLat: number;
  let resolvedLng: number;
  let googleAddress: string;
  let userAddress: string;

  try {
    if (latitude != null && longitude != null) {
      resolvedLat = latitude;
      resolvedLng = longitude;
      const geo = await reverseGeocode(latitude, longitude);
      googleAddress = geo.formattedAddress;
      userAddress = address || googleAddress;
    } else if (address) {
      const geo = await forwardGeocode(address);
      resolvedLat = geo.lat;
      resolvedLng = geo.lng;
      googleAddress = geo.formattedAddress;
      userAddress = address;
    } else {
      return { success: false, result: 'Please provide your delivery address or share your location.', cartState: null };
    }

    const { distanceKm, durationMin } = await getDistanceKm(
      settings.latitude,
      settings.longitude,
      resolvedLat,
      resolvedLng,
    );

    const feeResult = calculateDeliveryFee(
      distanceKm,
      settings.deliveryTiers,
      settings.maxDeliveryDistanceKm,
    );

    if ('error' in feeResult) {
      return { success: false, result: feeResult.error, cartState: null };
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    let cartState: any = { mode: 'browsing', items: [], updatedAt: new Date().toISOString() };
    if (customer?.cartState) {
      try {
        cartState = JSON.parse(customer.cartState);
      } catch {}
    }

    cartState.orderType = 'delivery';
    cartState.deliveryLocation = {
      latitude: resolvedLat,
      longitude: resolvedLng,
      address: userAddress,
      googleAddress,
      distanceKm,
      durationMin,
      fee: feeResult.fee,
      notes: notes || '',
      contactPhone: contactPhone || '',
    };
    cartState.mode = 'browsing';
    cartState.updatedAt = new Date().toISOString();

    await prisma.customer.update({
      where: { id: customerId },
      data: { cartState: JSON.stringify(cartState) },
    });

    return {
      success: true,
      result: `Delivery details confirmed:
📍 Address: ${userAddress}
${googleAddress !== userAddress ? `🗺️ Google Maps: ${googleAddress}\n` : ''}📏 Distance: ${distanceKm} km (≈${durationMin} min)
💰 Delivery fee: ${feeResult.fee.toFixed(2)}${notes ? `\n📝 Notes: ${notes}` : ''}${contactPhone ? `\n📞 Contact: ${contactPhone}` : ''}

Now let me know what you'd like to order!`,
      cartState,
    };

  } catch (error: any) {
    console.error('[SetDeliveryAddress] Error:', error);
    if (error?.message?.includes('GOOGLE_MAPS_API_KEY')) {
      return { success: false, result: 'Could not verify your location right now. Please type your address manually and we\'ll proceed without automatic distance calculation.', cartState: null };
    }
    return { success: false, result: 'Could not resolve your location. Please try again or type your address differently.', cartState: null };
  }
}
