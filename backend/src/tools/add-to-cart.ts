import { prisma } from '../lib/prisma.js';
import { findBestMatch, findOption, getAvailableOptions } from '../lib/menu-matcher.js';
import { getCartState, saveCartState } from '../services/ai-engine/cart-state.js';
import type { CartState, CartItem } from '../services/ai-engine/cart-state.js';

export interface AddToCartParams {
  name: string;
  quantity: number;
  optionName?: string;
  notes?: string;
}

export async function handleAddToCart(
  businessId: string,
  customerId: string,
  params: AddToCartParams,
  cartState: CartState,
): Promise<{ success: boolean; result: string; cartState: CartState }> {
  const { name, quantity, optionName, notes } = params;

  if (!name || !quantity || quantity < 1) {
    return {
      success: false,
      result: 'Please provide a valid item name and quantity (minimum 1).',
      cartState,
    };
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      category: { businessId },
      available: true,
    },
    include: { options: true },
  });

  const baseItems = menuItems.map(({ options, ...mi }) => mi);
  const matched = findBestMatch(name, baseItems);

  if (!matched) {
    return {
      success: false,
      result: `Could not find "${name}" on the menu. Please check the menu and try again with an exact item name.`,
      cartState,
    };
  }

  const fullMenuItem = menuItems.find((mi) => mi.id === matched.id);
  if (!fullMenuItem) {
    return {
      success: false,
      result: `Could not find "${name}" on the menu. Please check the menu and try again.`,
      cartState,
    };
  }

  let matchedOption: { id: string; name: string; price: number } | undefined;

  if (optionName) {
    if (!fullMenuItem.options || fullMenuItem.options.length === 0) {
      return {
        success: false,
        result: `"${fullMenuItem.name}" does not have any options. Please remove the option.`,
        cartState,
      };
    }

    matchedOption = findOption(optionName, fullMenuItem.options);

    if (!matchedOption) {
      const available = getAvailableOptions(fullMenuItem.options);
      return {
        success: false,
        result: `Could not find option "${optionName}" for "${fullMenuItem.name}". Available options: ${available}`,
        cartState,
      };
    }
  }

  if (!optionName && fullMenuItem.options && fullMenuItem.options.length > 0) {
    const available = getAvailableOptions(fullMenuItem.options);
    return {
      success: false,
      result: `"${fullMenuItem.name}" has options. Please ask the customer which option they want. Available options: ${available}`,
      cartState,
    };
  }

  const existingIndex = cartState.items.findIndex(
    (item) =>
      item.name === fullMenuItem.name &&
      item.optionName === (matchedOption?.name || undefined),
  );

  let updatedItems: CartItem[];

  if (existingIndex >= 0) {
    updatedItems = cartState.items.map((item, idx) =>
      idx === existingIndex
        ? { ...item, quantity: item.quantity + quantity }
        : item,
    );
  } else {
    const newItem: CartItem = {
      menuItemId: fullMenuItem.id,
      name: fullMenuItem.name,
      nameAr: fullMenuItem.nameAr,
      quantity,
      unitPrice: fullMenuItem.price,
      optionName: matchedOption?.name,
      optionPrice: matchedOption?.price,
      notes,
    };
    updatedItems = [...cartState.items, newItem];
  }

  const updatedState: CartState = {
    ...cartState,
    mode: 'cart_review',
    items: updatedItems,
    updatedAt: new Date().toISOString(),
  };

  await saveCartState(customerId, updatedState);

  const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
  const displayName = matchedOption
    ? `${fullMenuItem.name} (${matchedOption.name})`
    : fullMenuItem.name;

  return {
    success: true,
    result: `Added ${quantity}x ${displayName}${notes ? ` (${notes})` : ''}. Cart now has ${updatedItems.length} item(s), ${totalItems} total units.`,
    cartState: updatedState,
  };
}
