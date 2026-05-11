import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';
import { logError } from '../services/error-log.js';
import { generateOrderReferenceId } from '../lib/order-ref.js';
import { getCartState } from '../services/ai-engine/cart-state.js';

export interface OrderItemInput {
  name: string;
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

// Arabic-aware normalization for fuzzy matching
function normalizeArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(itemName: string | undefined, menuName: string): boolean {
  if (!itemName) return false;
  const normalize = (s: string) => normalizeArabic(s);

  const a = normalize(itemName);
  const b = normalize(menuName);

  if (!a || !b) return false;

  // Exact match
  if (a === b) return true;

  // Contains match
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap match
  const wordsA = a.split(/\s+/).filter(Boolean);
  const wordsB = b.split(/\s+/).filter(Boolean);
  const overlap = wordsA.filter((w) => wordsB.some((wb) => wb.includes(w) || w.includes(wb)));

  return overlap.length > 0;
}

// Strip parenthetical translations like "Mixed Grill (مشويات مشكلة)" → "مشويات مشكلة"
function stripParenthetical(s: string): string {
  return s
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface MenuItemWithOptions {
  id: string;
  name: string;
  nameAr: string | null;
  price: number;
  options?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

function findBestMatch(
  itemName: string,
  menuItems: Array<{ id: string; name: string; nameAr: string | null; price: number }>
): typeof menuItems[0] | undefined {
  const cleanedItem = stripParenthetical(itemName);

  // 1. Exact match on name or nameAr (with cleaned item name)
  const exact = menuItems.find(
    (mi) => mi.name === cleanedItem || mi.name === itemName || mi.nameAr === cleanedItem || mi.nameAr === itemName
  );
  if (exact) return exact;

  // 2. Fuzzy match against both name and nameAr (with cleaned item name)
  for (const mi of menuItems) {
    if (fuzzyMatch(cleanedItem, mi.name)) return mi;
    if (fuzzyMatch(itemName, mi.name)) return mi;
    if (mi.nameAr && fuzzyMatch(cleanedItem, mi.nameAr)) return mi;
    if (mi.nameAr && fuzzyMatch(itemName, mi.nameAr)) return mi;
  }

  return undefined;
}

// Find an option by name using fuzzy matching
function findOption(
  optionName: string,
  options: MenuItemWithOptions['options']
): { id: string; name: string; price: number } | undefined {
  if (!options || options.length === 0) return undefined;

  const cleanedOptionName = stripParenthetical(optionName);

  // First try exact match on name
  for (const opt of options) {
    if (opt.name === cleanedOptionName || opt.name === optionName) {
      return opt;
    }
  }

  // Then try fuzzy match
  for (const opt of options) {
    if (fuzzyMatch(cleanedOptionName, opt.name)) return opt;
    if (fuzzyMatch(optionName, opt.name)) return opt;
  }

  return undefined;
}

// Get available options as a formatted string
function getAvailableOptions(
  options: MenuItemWithOptions['options']
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

    // Get all available menu items for matching, including options
    const menuItems = await prisma.menuItem.findMany({
      where: {
        category: {
          businessId,
        },
        available: true,
      },
      include: {
        options: true,
      },
    });

    // Match items to menu
    const matchedItems: Array<{
      menuItem: MenuItemWithOptions;
      quantity: number;
      notes?: string;
      option?: {
        id: string;
        name: string;
        price: number;
      };
    }> = [];

    const unmatched: string[] = [];

    for (const item of items) {
      // First find the best menu item match
      const baseMenuItems = menuItems.map(({ options, ...mi }) => mi);
      const matched = findBestMatch(item.name, baseMenuItems);

      if (matched) {
        // Find the full menu item with options
        const fullMenuItem = menuItems.find((mi) => mi.id === matched.id);
        if (!fullMenuItem) {
          unmatched.push(item.name);
          continue;
        }

        // If option name is provided, try to match it
        let option: { id: string; name: string; price: number } | undefined;

        if (item.optionName) {
          // Check if menu item has options
          if (!fullMenuItem.options || fullMenuItem.options.length === 0) {
            console.error('[SubmitOrder] Option requested for item with no options', { businessId, customerId, itemName: item.name, optionName: item.optionName });
            return `Item '${item.name}' does not have options. Please remove the option '${item.optionName}' and try again.`;
          }

          option = findOption(
            item.optionName,
            fullMenuItem.options
          );

          if (!option) {
            const availableOptions = getAvailableOptions(fullMenuItem.options);
            console.error('[SubmitOrder] Option not found', { businessId, customerId, itemName: item.name, optionName: item.optionName, availableOptions });
            return `Could not find option '${item.optionName}' for item '${item.name}'. Available options: ${availableOptions}`;
          }
        } else if (fullMenuItem.options && fullMenuItem.options.length > 0) {
          const availableOptions = getAvailableOptions(fullMenuItem.options);
          console.error('[SubmitOrder] Option required but not provided', { businessId, customerId, itemName: item.name, availableOptions });
          return `Please specify an option for '${item.name}'. Available options: ${availableOptions}`;
        }

        matchedItems.push({
          menuItem: fullMenuItem,
          quantity: item.quantity,
          notes: item.notes,
          option,
        });
      } else {
        unmatched.push(item.name);
      }
    }

    if (unmatched.length > 0) {
      console.error('[SubmitOrder] Items not found in menu', { businessId, customerId, unmatched, items });
      return `Could not find: ${unmatched.join(', ')}. Please check the menu and try again.`;
    }

    if (matchedItems.length === 0) {
      console.error('[SubmitOrder] No valid items to order', { businessId, customerId, items });
      return 'No valid items found to order.';
    }

    // Calculate total price (menu item price + option price, if any)
    const totalPrice = matchedItems.reduce((sum, item) => {
      const itemPrice = item.menuItem.price + (item.option?.price || 0);
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
    const referenceId = await generateOrderReferenceId(businessId);

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
      orderId: order.id,
      referenceId: order.referenceId,
      customerId,
      items: orderItems.map((oi) => ({
        name: oi.menuItem.name,
        quantity: oi.quantity,
        price: oi.menuItem.price,
        optionName: oi.option?.name || null,
        optionPrice: oi.option?.price || 0,
        notes: oi.notes,
      })),
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
    });

    // Format confirmation with option details
    const lines = [`Order ${order.referenceId} confirmed:`, ''];
    for (const oi of orderItems) {
      const itemPrice = oi.menuItem.price + (oi.option?.price || 0);
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
