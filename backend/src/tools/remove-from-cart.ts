import { prisma } from '../lib/prisma.js';
import type { CartState } from '../services/ai-engine/cart-state.js';

export interface RemoveFromCartParams {
  index: number;
}

type RemoveFromCartResult =
  | { success: true; result: string; cartState: CartState }
  | { success: false; result: string; cartState: null };

export async function handleRemoveFromCart(
  businessId: string,
  customerId: string,
  params: RemoveFromCartParams,
): Promise<RemoveFromCartResult> {
  const { index } = params;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer?.cartState) {
    return { success: false, result: 'Your cart is empty. Add items first.', cartState: null };
  }

  let cartState: CartState;
  try {
    cartState = JSON.parse(customer.cartState) as CartState;
  } catch {
    return { success: false, result: 'Your cart is empty. Add items first.', cartState: null };
  }

  if (!Number.isInteger(index) || index < 0 || index >= cartState.items.length) {
    return {
      success: false,
      result: !Number.isInteger(index)
        ? 'Cart item index must be a whole number.'
        : `Cart item at index ${index} not found. Current cart has ${cartState.items.length} item(s).`,
      cartState: null,
    };
  }

  const removed = cartState.items[index];
  cartState.items.splice(index, 1);
  cartState.updatedAt = new Date().toISOString();

  await prisma.customer.update({
    where: { id: customerId },
    data: { cartState: JSON.stringify(cartState) },
  });

  const settings = await prisma.restaurantSettings.findUnique({ where: { businessId } });
  const currency = settings?.currency || 'SAR';

  const cartTotal = cartState.items.reduce(
    (sum, i) => sum + (i.unitPrice + (i.optionPrice || 0)) * i.quantity, 0,
  );

  const optionStr = removed.optionName ? ` [${removed.optionName}]` : '';
  const quantityStr = removed.quantity > 1 ? `${removed.quantity}x ` : '';

  return {
    success: true,
    result: `Removed from cart:\n- ${quantityStr}${removed.name}${optionStr}\nCart total: ${cartTotal.toFixed(2)} ${currency}`,
    cartState,
  };
}
