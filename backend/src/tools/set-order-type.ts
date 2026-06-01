import { prisma } from '../lib/prisma.js';
import { getCartState, saveCartState, type CartState } from '../services/ai-engine/cart-state.js';

export interface SetOrderTypeParams {
  orderType?: 'pickup' | 'dine_in';
}

type SetOrderTypeResult =
  | { success: true; result: string; cartState: CartState }
  | { success: false; result: string; cartState: null };

export async function handleSetOrderType(
  businessId: string,
  customerId: string,
  params: SetOrderTypeParams,
): Promise<SetOrderTypeResult> {
  const { orderType } = params;

  if (orderType !== 'pickup' && orderType !== 'dine_in') {
    return {
      success: false,
      result: "Please specify an order type of 'pickup' or 'dine_in'. For delivery, use set_delivery_address.",
      cartState: null,
    };
  }

  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId },
  });

  if (!settings) {
    return { success: false, result: 'Restaurant settings not configured.', cartState: null };
  }

  if (orderType === 'pickup' && !settings.pickupEnabled) {
    return { success: false, result: 'Pickup is not available at this restaurant.', cartState: null };
  }

  if (orderType === 'dine_in' && !settings.dineInEnabled) {
    return { success: false, result: 'Dine-in is not available at this restaurant.', cartState: null };
  }

  const cartState = await getCartState(customerId);
  const updated: CartState = {
    ...cartState,
    orderType,
    deliveryLocation: undefined,
  };

  await saveCartState(customerId, updated);

  const label = orderType === 'pickup' ? 'pickup' : 'dine-in';
  return {
    success: true,
    result: `Order type set to ${label}.`,
    cartState: updated,
  };
}
