import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';
import { logError } from '../services/error-log.js';
import { generateOrderReferenceId } from '../lib/order-ref.js';

export interface OrderItemInput {
  name: string;
  quantity: number;
  notes?: string;
}

export interface SubmitOrderParams {
  items: OrderItemInput[];
  orderNotes?: string;
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

export async function handleSubmitOrder(
  businessId: string,
  customerId: string,
  params: SubmitOrderParams
): Promise<string> {
  const { items, orderNotes } = params;

  try {
    if (!items || items.length === 0) {
      return 'No items provided for the order.';
    }

    // Get all available menu items for matching
    const menuItems = await prisma.menuItem.findMany({
      where: {
        category: {
          businessId,
        },
        available: true,
      },
    });

    // Match items to menu
    const matchedItems: Array<{
      menuItem: any;
      quantity: number;
      notes?: string;
    }> = [];

    const unmatched: string[] = [];

    for (const item of items) {
      const matched = findBestMatch(item.name, menuItems);

      if (matched) {
        matchedItems.push({
          menuItem: matched,
          quantity: item.quantity,
          notes: item.notes,
        });
      } else {
        unmatched.push(item.name);
      }
    }

    if (unmatched.length > 0) {
      return `Could not find: ${unmatched.join(', ')}. Please check the menu and try again.`;
    }

    if (matchedItems.length === 0) {
      return 'No valid items found to order.';
    }

    // Calculate total price
    const totalPrice = matchedItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );

    // Create order with items in a transaction
    const referenceId = await generateOrderReferenceId(businessId);
    
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          businessId,
          customerId,
          totalPrice,
          notes: orderNotes,
          status: 'pending',
          referenceId,
        },
      });

      // Create order items
      for (const item of matchedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: item.menuItem.id,
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
      include: { menuItem: true },
    });

    // Emit Socket.io event
    emitToBusinessRoom(businessId, 'new-order', {
      orderId: order.id,
      referenceId: order.referenceId,
      customerId,
      items: orderItems.map((oi) => ({
        name: oi.menuItem.name,
        quantity: oi.quantity,
        price: oi.menuItem.price,
        notes: oi.notes,
      })),
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
    });

    // Format confirmation
    const lines = [`Order ${order.referenceId} confirmed:`, ''];
    for (const oi of orderItems) {
      const subtotal = oi.menuItem.price * oi.quantity;
      lines.push(
        `- ${oi.quantity}x ${oi.menuItem.name} (${subtotal.toFixed(2)})`
      );
    }
    lines.push('');
    lines.push(`Total: ${totalPrice.toFixed(2)}`);
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
