import { prisma } from '../lib/prisma.js';
import type { CartState, CartItem } from '../services/ai-engine/cart-state.js';
import { generateCartItemId, calculateCartTotal } from '../services/ai-engine/cart-state.js';

export interface AddToCartItemInput {
  itemId: string;
  quantity: number;
  optionId?: string;
  notes?: string;
}

export interface AddToCartParams {
  items: AddToCartItemInput[];
}

type AddToCartResult =
  | { success: true; result: string; cartState: CartState }
  | { success: false; result: string; cartState: null };

export async function handleAddToCart(
  businessId: string,
  customerId: string,
  params: AddToCartParams,
): Promise<AddToCartResult> {
  const { items } = params;

  if (!items || items.length === 0) {
    return { success: false, result: 'No items provided to add to cart.', cartState: null };
  }

  const settings = await prisma.restaurantSettings.findUnique({ where: { businessId } });
  const currency = settings?.currency || 'SAR';

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: items.map(i => i.itemId) },
      category: { businessId },
    },
    include: { options: true },
  });

  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

  const cartItems: CartItem[] = [];

  for (const input of items) {
    const menuItem = menuItemMap.get(input.itemId);
    if (!menuItem) {
      return { success: false, result: `Menu item not found or unavailable.`, cartState: null };
    }

    if (!menuItem.available) {
      return { success: false, result: `'${menuItem.name}' is currently unavailable.`, cartState: null };
    }

    if (input.quantity < 1) {
      return { success: false, result: `Invalid quantity for '${menuItem.name}'. Quantity must be at least 1.`, cartState: null };
    }

    let optionName: string | undefined;
    let optionPrice = 0;
    let resolvedOptionId: string | undefined;

    if (input.optionId) {
      const option = menuItem.options.find(o => o.id === input.optionId);
      if (!option) {
        return { success: false, result: `Option not found for '${menuItem.name}'.`, cartState: null };
      }
      resolvedOptionId = option.id;
      optionName = option.name;
      optionPrice = option.price;
    } else if (menuItem.options && menuItem.options.length > 0) {
      return { success: false, result: `'${menuItem.name}' requires an option.`, cartState: null };
    }

    cartItems.push({
      cartItemId: generateCartItemId(),
      menuItemId: menuItem.id,
      name: menuItem.name,
      nameAr: menuItem.nameAr,
      quantity: input.quantity,
      unitPrice: menuItem.basePrice ?? 0,
      optionName,
      optionPrice,
      optionId: resolvedOptionId,
      notes: input.notes,
    });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  let cartState: CartState;
  if (customer?.cartState) {
    try {
      cartState = JSON.parse(customer.cartState) as CartState;
    } catch {
      cartState = { mode: 'browsing', items: [], updatedAt: new Date().toISOString() };
    }
  } else {
    cartState = { mode: 'browsing', items: [], updatedAt: new Date().toISOString() };
  }

  cartState.items.push(...cartItems);
  cartState.updatedAt = new Date().toISOString();

  await prisma.customer.update({
    where: { id: customerId },
    data: { cartState: JSON.stringify(cartState) },
  });

  const lines: string[] = ['Added to cart:'];
  for (const item of cartItems) {
    const itemPrice = item.unitPrice + (item.optionPrice || 0);
    const lineTotal = itemPrice * item.quantity;
    const optionStr = item.optionName ? ` [${item.optionName}]` : '';
    lines.push(`- ${item.quantity}x ${item.name}${optionStr} - ${lineTotal.toFixed(2)} ${currency}`);
  }
  lines.push(`Cart total: ${calculateCartTotal(cartState.items).toFixed(2)} ${currency}`);

  return {
    success: true,
    result: lines.join('\n'),
    cartState,
  };
}

