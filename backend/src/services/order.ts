import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';
import { generateOrderReferenceId } from '../lib/order-ref.js';

export interface CreateOrderInput {
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export async function createOrder(
  businessId: string,
  customerId: string,
  items: CreateOrderInput['items'],
  notes?: string
): Promise<any> {
  // FIX Issue 4: Wrap everything in transaction to prevent TOCTOU race condition
  const order = await prisma.$transaction(async (tx) => {
    // FIX Issue 1: Batch fetch all menu items at once (was N+1 queries)
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await tx.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = new Set(menuItems.map(m => m.id));
      const missingId = menuItemIds.find(id => !foundIds.has(id));
      throw new Error(`Menu item ${missingId} not found`);
    }

    // Calculate total price
    let totalPrice = 0;
    const orderItems: Array<{ menuItemId: string; quantity: number; notes?: string }> = [];

    for (const item of items) {
      const menuItem = menuItems.find(m => m.id === item.menuItemId)!;
      totalPrice += (menuItem.basePrice ?? 0) * item.quantity;
      orderItems.push({
        menuItemId: menuItem.id,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    // Create order with reference ID
    const referenceId = await generateOrderReferenceId(businessId);
    
    const order = await tx.order.create({
      data: {
        businessId,
        customerId,
        totalPrice,
        notes,
        status: 'pending',
        referenceId,
      },
    });

    // Create order items
    for (const item of orderItems) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        },
      });
    }

    return order;
  });

  // Get order items for socket event
  const createdOrderItems = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    include: { menuItem: true },
  });

  // Emit Socket.io event
  emitToBusinessRoom(businessId, 'new-order', {
    orderId: order.id,
    referenceId: order.referenceId,
    customerId,
    items: createdOrderItems.map((oi) => ({
      name: oi.menuItem.name,
      quantity: oi.quantity,
      price: oi.menuItem.basePrice ?? 0,
      notes: oi.notes,
    })),
    totalPrice: order.totalPrice,
    createdAt: order.createdAt,
  });

  return order;
}

export async function updateStatus(
  orderId: string,
  status: string,
  businessId: string
): Promise<any> {
  // FIX Issue 2: Status validation
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid values: ${validStatuses.join(', ')}`);
  }

  // FIX Issue 3: Verify business ownership
  const existing = await prisma.order.findFirst({
    where: { id: orderId, businessId }
  });

  if (!existing) {
    throw new Error('Order not found or access denied');
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  // Emit Socket.io event
  emitToBusinessRoom(order.businessId, 'order-updated', {
    orderId,
    status,
    updatedAt: order.updatedAt,
  });

  return order;
}

export async function getOrdersByBusiness(
  businessId: string,
  statusFilter?: string
): Promise<any[]> {
  const where: any = { businessId };

  if (statusFilter) {
    where.status = statusFilter;
  }

  return prisma.order.findMany({
    where,
    include: {
      customer: true,
      items: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrderById(orderId: string): Promise<any | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: { menuItem: true },
      },
    },
  });
}
