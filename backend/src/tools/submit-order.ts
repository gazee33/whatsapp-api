import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';
import { logError } from '../services/error-log.js';
import { generateOrderReferenceId } from '../lib/order-ref.js';
import { getCartState } from '../services/ai-engine/cart-state.js';

export interface OrderItemInput {
  itemId: string;
  quantity: number;
  notes?: string;
  optionName?: string;
}

export interface SubmitOrderParams {
  items: OrderItemInput[];
  orderNotes?: string;
  orderType?: 'delivery' | 'dine_in' | 'pickup';
  deliveryAddress?: string;
  deliveryNotes?: string;
  contactPhone?: string;
}

function findOption(
  optionName: string,
  options: Array<{ id: string; name: string; price: number }>
): { id: string; name: string; price: number } | undefined {
  if (!options || options.length === 0) return undefined;

  const exact = options.find((opt) => opt.name === optionName);
  if (exact) return exact;

  const lowered = optionName.toLowerCase().trim();
  return options.find((opt) => opt.name.toLowerCase().trim() === lowered);
}

function getAvailableOptions(
  options: Array<{ id: string; name: string; price: number }>
): string {
  if (!options || options.length === 0) return '';

  return options.map((opt) => {
    const priceStr = opt.price > 0 ? ` (+${opt.price.toFixed(2)})` : '';
    return `${opt.name}${priceStr}`;
  }).join(', ');
}

export async function handleSubmitOrder(
  businessId: string,
  customerId: string,
  params: SubmitOrderParams
): Promise<string> {
  const { items, orderNotes, deliveryNotes, contactPhone } = params;
  let { deliveryAddress } = params;
  let { orderType } = params;

  try {
    if (!items || items.length === 0) {
      console.error('[SubmitOrder] Validation: no items provided', { businessId, customerId, params });
      return 'No items provided for the order.';
    }

    // Fall back to cart-stored orderType if not in params
    if (!orderType) {
      const cart = await getCartState(customerId);
      if (cart.orderType) {
        orderType = cart.orderType;
      }
    }

    // Fetch menu items by ID
    const itemIds = items.map((i) => i.itemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        category: { businessId },
        available: true,
      },
      include: { options: true },
    });

    const foundIds = new Set(menuItems.map((m) => m.id));
    const missingIds = itemIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      console.error('[SubmitOrder] Items not found or unavailable', { businessId, customerId, missingIds });
      return `Some items were not found or are unavailable. Please check the menu and try again (IDs: ${missingIds.join(', ')}).`;
    }

    // Map menu items by ID for O(1) lookup
    const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

    const matchedItems: Array<{
      menuItem: typeof menuItems[0];
      quantity: number;
      notes?: string;
      option?: { id: string; name: string; price: number };
    }> = [];

    for (const item of items) {
      const menuItem = menuItemById.get(item.itemId);
      if (!menuItem) {
        console.error('[SubmitOrder] Item not found in fetched set', { businessId, customerId, itemId: item.itemId });
        return `Item was not found. Please check the menu and try again.`;
      }

      let option: { id: string; name: string; price: number } | undefined;

      if (item.optionName) {
        if (!menuItem.options || menuItem.options.length === 0) {
          console.error('[SubmitOrder] Option requested for item with no options', { businessId, customerId, itemId: item.itemId, optionName: item.optionName });
          return `Item '${menuItem.name}' does not have options. Please remove the option '${item.optionName}' and try again.`;
        }

        option = findOption(item.optionName, menuItem.options);

        if (!option) {
          const availableOptions = getAvailableOptions(menuItem.options);
          console.error('[SubmitOrder] Option not found', { businessId, customerId, itemId: item.itemId, optionName: item.optionName, availableOptions });
          return `Could not find option '${item.optionName}' for item '${menuItem.name}'. Available options: ${availableOptions}`;
        }
      } else if (menuItem.options && menuItem.options.length > 0) {
        const availableOptions = getAvailableOptions(menuItem.options);
        console.error('[SubmitOrder] Option required but not provided', { businessId, customerId, itemId: item.itemId, availableOptions });
        return `Please specify an option for '${menuItem.name}'. Available options: ${availableOptions}`;
      }

      matchedItems.push({
        menuItem,
        quantity: item.quantity,
        notes: item.notes,
        option,
      });
    }

    if (matchedItems.length === 0) {
      console.error('[SubmitOrder] No valid items to order', { businessId, customerId, items });
      return 'No valid items found to order.';
    }

    // Calculate total price (menu item price + option price, if any)
    const totalPrice = matchedItems.reduce((sum, item) => {
      const itemPrice = (item.menuItem.basePrice ?? 0) + (item.option?.price || 0);
      return sum + itemPrice * item.quantity;
    }, 0);

    // Load cart state for delivery location info if delivery order
    let deliveryDistanceKm: number | undefined;
    let customerLatitude: number | undefined;
    let customerLongitude: number | undefined;
    let cartDeliveryFee: number | undefined;
    if (orderType === 'delivery') {
      const cart = await getCartState(customerId);
      if (cart.deliveryLocation) {
        deliveryDistanceKm = cart.deliveryLocation.distanceKm;
        customerLatitude = cart.deliveryLocation.latitude;
        customerLongitude = cart.deliveryLocation.longitude;
        cartDeliveryFee = cart.deliveryLocation.fee;
        // Use cart address as fallback if LLM didn't provide deliveryAddress
        if (!deliveryAddress && cart.deliveryLocation.address) {
          deliveryAddress = cart.deliveryLocation.address;
        }
      }
    }

    // Include delivery fee in total price for delivery orders
    const totalWithDelivery = cartDeliveryFee ? totalPrice + cartDeliveryFee : totalPrice;

    // Create order with items in a transaction
    const referenceId = generateOrderReferenceId();

    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          businessId,
          customerId,
          totalPrice: totalWithDelivery,
          notes: orderNotes,
          status: 'pending',
          referenceId,
          orderType: orderType || null,
          deliveryAddress: deliveryAddress || null,
          deliveryNotes: deliveryNotes || null,
          deliveryDistanceKm: deliveryDistanceKm || null,
          customerLatitude: customerLatitude || null,
          customerLongitude: customerLongitude || null,
          contactPhone: contactPhone || null,
        },
      });

      // Create order items
      for (const item of matchedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: item.menuItem.id,
            optionId: item.option?.id || null,
            quantity: item.quantity,
            notes: item.notes,
          },
        });
      }

      return order;
    });

    // Get order items for confirmation
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: {
        menuItem: true,
        option: true,
      },
    });

    // Emit Socket.io event with option info
    emitToBusinessRoom(businessId, 'new-order', {
      id: order.id,
      referenceId: order.referenceId,
      status: order.status,
      businessId,
      customerId,
      items: orderItems.map((oi) => ({
        name: oi.menuItem.name,
        quantity: oi.quantity,
        price: oi.menuItem.basePrice ?? 0,
        optionName: oi.option?.name || null,
        optionPrice: oi.option?.price || 0,
        notes: oi.notes,
      })),
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });

    // Format confirmation with option details
    const lines = [`Order ${order.referenceId} confirmed:`, ''];
    for (const oi of orderItems) {
      const itemPrice = (oi.menuItem.basePrice ?? 0) + (oi.option?.price || 0);
      const subtotal = itemPrice * oi.quantity;

      if (oi.option) {
        lines.push(
          `- ${oi.quantity}x ${oi.menuItem.name} (${oi.option.name}) (${subtotal.toFixed(2)})`
        );
      } else {
        lines.push(
          `- ${oi.quantity}x ${oi.menuItem.name} (${subtotal.toFixed(2)})`
        );
      }
    }
    lines.push('');
    if (cartDeliveryFee) {
      lines.push(`Subtotal: ${totalPrice.toFixed(2)}`);
      lines.push(`🚚 Delivery fee: ${cartDeliveryFee.toFixed(2)}`);
    }
    lines.push(`Total: ${totalWithDelivery.toFixed(2)}`);

    if (order.orderType) {
      const typeLabels: Record<string, string> = {
        delivery: 'Delivery',
        dine_in: 'Dine-in',
        pickup: 'Pickup',
      };
      lines.push(`Type: ${typeLabels[order.orderType] || order.orderType}`);
      if (order.orderType === 'delivery' && order.deliveryAddress) {
        lines.push(`📍 Deliver to: ${order.deliveryAddress}`);
      }
      if (order.orderType === 'delivery' && deliveryDistanceKm) {
        lines.push(`📏 Distance: ${deliveryDistanceKm} km`);
      }
    }

    lines.push('');
    lines.push('Your order has been received and is being prepared!');

    return lines.join('\n');
  } catch (error: any) {
    console.error('[SubmitOrder] Error:', error);
    await logError({
      businessId,
      customerId,
      errorType: error?.constructor?.name || 'Error',
      errorMessage: error?.message || 'Failed to submit order',
      errorStack: error?.stack,
      context: { items, orderNotes },
    });
    throw error; // Re-throw so the AI agent knows there was an error
  }
}
