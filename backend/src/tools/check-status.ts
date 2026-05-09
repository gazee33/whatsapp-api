import { prisma } from '../lib/prisma.js';

export interface CheckStatusParams {
  orderId?: string;
}

export async function handleCheckStatus(
  businessId: string,
  customerId: string,
  params: CheckStatusParams
): Promise<string> {
  const { orderId } = params;

  let order;

  if (orderId) {
    // Find specific order
    order = await prisma.order.findFirst({
      where: {
        id: orderId,
        businessId,
        customerId,
      },
      include: {
        items: {
          include: { menuItem: true, option: true },
        },
      },
    });
  } else {
    // Find latest order for customer
    order = await prisma.order.findFirst({
      where: {
        businessId,
        customerId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { menuItem: true, option: true },
        },
      },
    });
  }

  if (!order) {
    return 'No orders found.';
  }

  // Format status response
  const statusEmoji: Record<string, string> = {
    pending: '\u23F1\uFE0F',
    preparing: '\u{1F373}',
    ready: '\u2713\uFE0F',
    delivered: '\u{1F69A}',
    cancelled: '\u274C',
  };

  const emoji = statusEmoji[order.status] || '\u2753';
  const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);

  const lines = [
    `Order ${order.referenceId}`,
    `${emoji} Status: ${statusText}`,
    '',
    'Items:',
  ];

  for (const item of order.items) {
    const optionStr = item.option ? ` (${item.option.name})` : '';
    lines.push(
      `- ${item.quantity}x ${item.menuItem.name}${optionStr}`
    );
  }

  lines.push('');
  lines.push(`Total: ${order.totalPrice.toFixed(2)}`);
  lines.push('');

  const createdAt = new Date(order.createdAt);
  const timeStr = createdAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  lines.push(`Placed at: ${timeStr}`);

  return lines.join('\n');
}
