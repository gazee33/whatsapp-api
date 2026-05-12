import { prisma } from '../lib/prisma.js';
import type { CartState } from '../services/ai-engine/cart-state.js';

export interface UpdateCartParams {
  index: number;
  quantity: number;
  optionId?: string;
  notes?: string;
}

type UpdateCartResult =
  | { success: true; result: string; cartState: CartState }
  | { success: false; result: string; cartState: null };

export async function handleUpdateCart(
  businessId: string,
  customerId: string,
  params: UpdateCartParams,
): Promise<UpdateCartResult> {
  const { index, quantity, optionId, notes } = params;

  if (quantity < 1) {
    return { success: false, result: 'Quantity must be at least 1.', cartState: null };
  }

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

  const existing = cartState.items[index];

  let resolvedOptionId = existing.optionId;
  let optionName = existing.optionName;
  let optionPrice = existing.optionPrice || 0;

  if (optionId !== undefined) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: existing.menuItemId },
      include: { options: true },
    });

    if (!menuItem) {
      return { success: false, result: 'Original menu item no longer exists.', cartState: null };
    }

    if (!optionId) {
      // Clearing option — only allowed if item has no options
      if (menuItem.options && menuItem.options.length > 0) {
        return { success: false, result: `'${menuItem.name}' requires an option.`, cartState: null };
      }
      resolvedOptionId = undefined;
      optionName = undefined;
      optionPrice = 0;
    } else {
      const option = menuItem.options.find(o => o.id === optionId);
      if (!option) {
        return { success: false, result: `Option not found for '${menuItem.name}'.`, cartState: null };
      }
      resolvedOptionId = option.id;
      optionName = option.name;
      optionPrice = option.price;
    }
  }

  cartState.items[index] = {
    ...existing,
    quantity,
    optionName,
    optionPrice,
    optionId: resolvedOptionId,
    notes: notes !== undefined ? notes : existing.notes,
  };

  cartState.updatedAt = new Date().toISOString();

  await prisma.customer.update({
    where: { id: customerId },
    data: { cartState: JSON.stringify(cartState) },
  });

  const settings = await prisma.restaurantSettings.findUnique({ where: { businessId } });
  const currency = settings?.currency || 'SAR';

  const item = cartState.items[index];
  const itemPrice = item.unitPrice + (item.optionPrice || 0);
  const lineTotal = itemPrice * item.quantity;
  const optionStr = item.optionName ? ` [${item.optionName}]` : '';
  const cartTotal = cartState.items.reduce(
    (sum, i) => sum + (i.unitPrice + (i.optionPrice || 0)) * i.quantity, 0,
  );

  return {
    success: true,
    result: `Updated cart item [${index}]:\n- ${item.quantity}x ${item.name}${optionStr} - ${lineTotal.toFixed(2)} ${currency}\nCart total: ${cartTotal.toFixed(2)} ${currency}`,
    cartState,
  };
}
