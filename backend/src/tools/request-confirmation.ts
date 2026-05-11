import { type CartState, saveCartState } from '../services/ai-engine/cart-state.js';

export async function handleRequestConfirmation(
  customerId: string,
  cartState: CartState,
): Promise<{ success: boolean; result: string; cartState: CartState }> {
  if (cartState.items.length === 0) {
    return { success: false, result: 'Cannot confirm an empty order. You must call add_to_cart for each item the customer wants BEFORE calling request_confirmation. Example: add_to_cart name="Shawarma Chicken" quantity=2 optionName="Large". Then call request_confirmation again.', cartState };
  }

  if (cartState.mode === 'order_submitted') {
    return {
      success: false,
      result: 'This order has already been submitted. To place a new order, please start over.',
      cartState,
    };
  }

  const updatedState: CartState = {
    ...cartState,
    mode: 'awaiting_confirmation',
    updatedAt: new Date().toISOString(),
  };

  await saveCartState(customerId, updatedState);

  const itemCount = updatedState.items.length;
  const itemSummary = updatedState.items
    .slice(0, 3)
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(', ');
  const summaryText = itemCount <= 3
    ? itemSummary
    : `${itemSummary} and ${itemCount - 3} more item(s)`;

  return {
    success: true,
    result: `Confirmation mode set. Cart: ${itemCount} item(s): ${summaryText}.`,
    cartState: updatedState,
  };
}
