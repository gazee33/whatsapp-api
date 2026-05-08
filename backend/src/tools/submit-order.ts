import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';
import { logError } from '../services/error-log.js';
import { generateOrderReferenceId } from '../lib/order-ref.js';

export interface OrderItemInput {
  name: string;
  quantity: number;
  notes?: string;
  customizationDetailName?: string; // NEW - the selected variant/detail name
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

interface MenuItemWithCustomizations {
  id: string;
  name: string;
  nameAr: string | null;
  price: number;
  customizationHeaders?: Array<{
    id: string;
    name: string;
    nameAr: string | null;
    details: Array<{
      id: string;
      name: string;
      nameAr: string | null;
      price: number;
    }>;
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

// Find a customization detail by name using fuzzy matching
function findCustomizationDetail(
  detailName: string,
  headers: MenuItemWithCustomizations['customizationHeaders']
): { id: string; name: string; nameAr: string | null; price: number } | undefined {
  if (!headers || headers.length === 0) return undefined;

  const cleanedDetailName = stripParenthetical(detailName);

  // First try exact match on name or nameAr
  for (const header of headers) {
    for (const detail of header.details) {
      if (detail.name === cleanedDetailName || detail.name === detailName) {
        return detail;
      }
      if (detail.nameAr === cleanedDetailName || detail.nameAr === detailName) {
        return detail;
      }
    }
  }

  // Then try fuzzy match
  for (const header of headers) {
    for (const detail of header.details) {
      if (fuzzyMatch(cleanedDetailName, detail.name)) return detail;
      if (fuzzyMatch(detailName, detail.name)) return detail;
      if (detail.nameAr && fuzzyMatch(cleanedDetailName, detail.nameAr)) return detail;
      if (detail.nameAr && fuzzyMatch(detailName, detail.nameAr)) return detail;
    }
  }

  return undefined;
}

// Get available customization options as a formatted string
function getAvailableCustomizations(
  headers: MenuItemWithCustomizations['customizationHeaders']
): string {
  if (!headers || headers.length === 0) return '';

  const options: string[] = [];
  for (const header of headers) {
    for (const detail of header.details) {
      const priceStr = detail.price > 0 ? ` (+${detail.price.toFixed(2)})` : '';
      options.push(`${header.name}: ${detail.name}${priceStr}`);
    }
  }
  return options.join(', ');
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

    // Get all available menu items for matching, including customization headers and details
    const menuItems = await prisma.menuItem.findMany({
      where: {
        category: {
          businessId,
        },
        available: true,
      },
      include: {
        customizationHeaders: {
          include: {
            details: true,
          },
        },
      },
    });

    // Match items to menu
    const matchedItems: Array<{
      menuItem: MenuItemWithCustomizations;
      quantity: number;
      notes?: string;
      customizationDetail?: {
        id: string;
        name: string;
        nameAr: string | null;
        price: number;
      };
    }> = [];

    const unmatched: string[] = [];

    for (const item of items) {
      // First find the best menu item match
      const baseMenuItems = menuItems.map(({ customizationHeaders, ...mi }) => mi);
      const matched = findBestMatch(item.name, baseMenuItems);

      if (matched) {
        // Find the full menu item with customizations
        const fullMenuItem = menuItems.find((mi) => mi.id === matched.id);
        if (!fullMenuItem) {
          unmatched.push(item.name);
          continue;
        }

        // If customization detail name is provided, try to match it
        let customizationDetail: { id: string; name: string; nameAr: string | null; price: number } | undefined;

        if (item.customizationDetailName) {
          // Check if menu item has customization options
          if (!fullMenuItem.customizationHeaders || fullMenuItem.customizationHeaders.length === 0) {
            // Item has no customization options but one was requested
            return `Item '${item.name}' does not have customization options. Please remove the customization '${item.customizationDetailName}' and try again.`;
          }

          customizationDetail = findCustomizationDetail(
            item.customizationDetailName,
            fullMenuItem.customizationHeaders
          );

          if (!customizationDetail) {
            const availableOptions = getAvailableCustomizations(fullMenuItem.customizationHeaders);
            return `Could not find customization option '${item.customizationDetailName}' for item '${item.name}'. Available options: ${availableOptions}`;
          }
        } else if (fullMenuItem.customizationHeaders && fullMenuItem.customizationHeaders.length > 0) {
          // Item has customization options but none was provided
          const availableOptions = getAvailableCustomizations(fullMenuItem.customizationHeaders);
          return `Please specify a customization option for '${item.name}'. Available options: ${availableOptions}`;
        }

        matchedItems.push({
          menuItem: fullMenuItem,
          quantity: item.quantity,
          notes: item.notes,
          customizationDetail,
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

    // Calculate total price (menu item price + customization detail price, if any)
    const totalPrice = matchedItems.reduce((sum, item) => {
      const itemPrice = item.menuItem.price + (item.customizationDetail?.price || 0);
      return sum + itemPrice * item.quantity;
    }, 0);

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
            customizationDetailId: item.customizationDetail?.id || null,
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
        customizationDetail: true,
      },
    });

    // Emit Socket.io event with customization info
    emitToBusinessRoom(businessId, 'new-order', {
      orderId: order.id,
      referenceId: order.referenceId,
      customerId,
      items: orderItems.map((oi) => ({
        name: oi.menuItem.name,
        quantity: oi.quantity,
        price: oi.menuItem.price,
        customizationDetailName: oi.customizationDetail?.name || null,
        customizationDetailPrice: oi.customizationDetail?.price || 0,
        notes: oi.notes,
      })),
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
    });

    // Format confirmation with customization details
    const lines = [`Order ${order.referenceId} confirmed:`, ''];
    for (const oi of orderItems) {
      const itemPrice = oi.menuItem.price + (oi.customizationDetail?.price || 0);
      const subtotal = itemPrice * oi.quantity;

      if (oi.customizationDetail) {
        // Show customization in format: "- 2x Shawarma Chicken (Size: Large) (60.00)"
        lines.push(
          `- ${oi.quantity}x ${oi.menuItem.name} (${oi.customizationDetail.name}) (${subtotal.toFixed(2)})`
        );
      } else {
        // Original format: "- 2x Coca Cola (10.00)"
        lines.push(
          `- ${oi.quantity}x ${oi.menuItem.name} (${subtotal.toFixed(2)})`
        );
      }
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