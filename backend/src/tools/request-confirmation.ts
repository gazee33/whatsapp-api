import { type CartState, saveCartState } from '../services/ai-engine/cart-state.js';

const VALID_ORDER_TYPES = ['delivery', 'dine_in', 'pickup'] as const;

export async function handleRequestConfirmation(
  customerId: string,
  cartState: CartState,
  orderType?: 'delivery' | 'dine_in' | 'pickup',
): Promise<{ success: boolean; result: string; cartState: CartState }> {
  if (cartState.mode === 'order_submitted') {
    return {
      success: false,
      result: 'This order has already been submitted. To place a new order, please start over.',
      cartState,
    };
  }

  if (cartState.mode === 'awaiting_confirmation') {
    if (orderType) {
      return {
        success: false,
        result: `Already awaiting confirmation. Order type is ${orderType}. Call submit_order if the customer confirms, or start over.`,
        cartState,
      };
    }
    return {
      success: false,
      result: 'Already awaiting confirmation. Call submit_order if the customer confirms, or start over.',
      cartState,
    };
  }

  const resolvedOrderType = orderType || cartState.orderType;

  if (!resolvedOrderType) {
    return {
      success: false,
      result: 'Order type is required but not yet known. Please ask the customer: "How would you like to receive your order? Delivery, dine-in, or pickup?" before calling request_confirmation.',
      cartState,
    };
  }

  if (!VALID_ORDER_TYPES.includes(resolvedOrderType as typeof VALID_ORDER_TYPES[number])) {
    return {
      success: false,
      result: `Invalid order type "${resolvedOrderType}". Valid options: ${VALID_ORDER_TYPES.join(', ')}.`,
      cartState,
    };
  }

  const updatedState: CartState = {
    ...cartState,
    mode: 'awaiting_confirmation',
    orderType: resolvedOrderType as 'delivery' | 'dine_in' | 'pickup',
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
  const typeLabel = resolvedOrderType === 'delivery' ? 'Delivery'
    : resolvedOrderType === 'dine_in' ? 'Dine-in'
    : 'Pickup';

  return {
    success: true,
    result: `Confirmation mode set. Type: ${typeLabel}. Cart: ${itemCount} item(s): ${summaryText}.`,
    cartState: updatedState,
  };
}
