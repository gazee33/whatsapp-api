import { prisma } from '../../lib/prisma.js';
import type { ToolDefinition } from '../../llm/types.js';
import type { ManagerToolContext, ManagerToolResult } from './index.js';
import { createAuditLog } from '../../services/audit.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

// ── Tool definitions ──────────────────────────────────────────────────────────

export const managerListOrdersDefinition: ToolDefinition = {
  name: 'manager_list_orders',
  description:
    'List recent orders for this restaurant. Supports filtering by status and date range. ' +
    'Returns a readable summary with reference ID, status, total, customer phone, time, and items.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: [...VALID_ORDER_STATUSES],
        description: 'Filter by order status. Omit to return all statuses.',
      },
      since: {
        type: 'string',
        description:
          'Return orders created at or after this time. Accepts ISO 8601 (e.g. "2025-05-19T00:00:00Z") or YYYY-MM-DD (treated as 00:00:00 UTC).',
      },
      until: {
        type: 'string',
        description:
          'Return orders created at or before this time. Accepts ISO 8601 or YYYY-MM-DD (treated as 23:59:59.999 UTC).',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of orders to return (default 20, max 100).',
      },
    },
    required: [],
  },
};

export const managerGetOrderDefinition: ToolDefinition = {
  name: 'manager_get_order',
  description:
    'Get full details for a single order: all items, customer phone, status, total, delivery address, and notes. ' +
    'Pass the short reference ID (e.g. "ORD-1234") or the internal cuid.',
  parameters: {
    type: 'object',
    properties: {
      referenceIdOrId: {
        type: 'string',
        description: 'The order reference ID (e.g. "ORD-1234") or the internal order ID.',
      },
    },
    required: ['referenceIdOrId'],
  },
};

export const managerUpdateOrderStatusDefinition: ToolDefinition = {
  name: 'manager_update_order_status',
  description:
    'Update the status of an order (pending → preparing → ready → delivered, or cancelled). ' +
    'Cancelling an order is destructive — only call this with status="cancelled" after manager_confirm has been invoked and the manager has tapped YES.',
  parameters: {
    type: 'object',
    properties: {
      referenceId: {
        type: 'string',
        description: 'The order reference ID (e.g. "ORD-1234").',
      },
      status: {
        type: 'string',
        enum: [...VALID_ORDER_STATUSES],
        description: 'New status for the order.',
      },
    },
    required: ['referenceId', 'status'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateParam(
  raw: string,
  endOfDay: boolean,
): { date: Date } | { error: string } {
  // Accept YYYY-MM-DD shorthand
  const yyyyMmDd = /^\d{4}-\d{2}-\d{2}$/;
  const expanded = yyyyMmDd.test(raw)
    ? `${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
    : raw;

  const ts = Date.parse(expanded);
  if (Number.isNaN(ts)) {
    return { error: `Invalid date "${raw}". Use ISO 8601 or YYYY-MM-DD format.` };
  }
  return { date: new Date(ts) };
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatItemSummary(
  items: Array<{ menuItem: { name: string }; quantity: number }>,
): string {
  if (items.length === 0) return '(no items)';
  const first = `${items[0].quantity}× ${items[0].menuItem.name}`;
  if (items.length === 1) return first;
  return `${first} +${items.length - 1} more`;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

interface ListOrdersArgs {
  status?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export async function handleManagerListOrders(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { status, since, until, limit: rawLimit } = args as ListOrdersArgs;

  // Validate status
  if (status !== undefined && !VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
    return {
      success: false,
      result: `Invalid status "${status}". Must be one of: ${VALID_ORDER_STATUSES.join(', ')}.`,
      errorCode: 'VALIDATION_ERROR',
    };
  }

  // Validate limit
  const limit = rawLimit !== undefined ? rawLimit : 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return {
      success: false,
      result: 'limit must be an integer between 1 and 100.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  // Parse date range
  let sinceDate: Date | undefined;
  let untilDate: Date | undefined;

  if (since !== undefined) {
    const parsed = parseDateParam(since, false);
    if ('error' in parsed) {
      return { success: false, result: parsed.error, errorCode: 'VALIDATION_ERROR' };
    }
    sinceDate = parsed.date;
  }

  if (until !== undefined) {
    const parsed = parseDateParam(until, true);
    if ('error' in parsed) {
      return { success: false, result: parsed.error, errorCode: 'VALIDATION_ERROR' };
    }
    untilDate = parsed.date;
  }

  // Build where clause — always scope by businessId
  const where: Record<string, unknown> = { businessId: ctx.businessId };
  if (status !== undefined) where.status = status;
  if (sinceDate !== undefined || untilDate !== undefined) {
    const createdAt: Record<string, Date> = {};
    if (sinceDate) createdAt.gte = sinceDate;
    if (untilDate) createdAt.lte = untilDate;
    where.createdAt = createdAt;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { phone: true } },
      items: { include: { menuItem: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  if (orders.length === 0) {
    const filterDesc = status ? ` with status "${status}"` : '';
    return {
      success: true,
      result: `No orders found${filterDesc}.`,
    };
  }

  // Build settings for currency display (best-effort, no failure if missing)
  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
    select: { currency: true },
  });
  const currency = settings?.currency ?? 'SAR';

  const lines: string[] = [`**Orders (${orders.length})**\n`];

  for (const order of orders) {
    const itemSummary = formatItemSummary(
      order.items as Array<{ menuItem: { name: string }; quantity: number }>,
    );
    lines.push(
      `• **${order.referenceId}** — ${order.status.toUpperCase()}` +
        ` | ${order.totalPrice.toFixed(2)} ${currency}` +
        ` | ${order.customer.phone}` +
        ` | ${timeAgo(order.createdAt)}` +
        `\n  Items: ${itemSummary}`,
    );
  }

  return { success: true, result: lines.join('\n') };
}

interface GetOrderArgs {
  referenceIdOrId: string;
}

export async function handleManagerGetOrder(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { referenceIdOrId } = args as GetOrderArgs;

  if (!referenceIdOrId || typeof referenceIdOrId !== 'string') {
    return {
      success: false,
      result: 'referenceIdOrId is required.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  // Try referenceId first, fall back to internal id — both scoped to businessId
  let order = await prisma.order.findFirst({
    where: { businessId: ctx.businessId, referenceId: referenceIdOrId },
    include: {
      customer: { select: { phone: true, name: true } },
      items: {
        include: {
          menuItem: { select: { name: true, basePrice: true } },
          option: { select: { name: true, price: true } },
        },
      },
    },
  });

  if (!order) {
    order = await prisma.order.findFirst({
      where: { businessId: ctx.businessId, id: referenceIdOrId },
      include: {
        customer: { select: { phone: true, name: true } },
        items: {
          include: {
            menuItem: { select: { name: true, basePrice: true } },
            option: { select: { name: true, price: true } },
          },
        },
      },
    });
  }

  if (!order) {
    return {
      success: false,
      result: `Order "${referenceIdOrId}" not found.`,
      errorCode: 'NOT_FOUND',
    };
  }

  const settings = await prisma.restaurantSettings.findUnique({
    where: { businessId: ctx.businessId },
    select: { currency: true },
  });
  const currency = settings?.currency ?? 'SAR';

  const itemLines = (
    order.items as Array<{
      quantity: number;
      menuItem: { name: string; basePrice: number | null };
      option: { name: string; price: number } | null;
      notes: string | null;
    }>
  ).map((item) => {
    const optionLabel = item.option ? ` (${item.option.name})` : '';
    const noteLabel = item.notes ? ` — note: ${item.notes}` : '';
    const linePrice = ((item.menuItem.basePrice ?? 0) + (item.option?.price ?? 0)) * item.quantity;
    return `  • ${item.quantity}× ${item.menuItem.name}${optionLabel}${noteLabel} — ${linePrice.toFixed(2)} ${currency}`;
  });

  const customer = order.customer as { phone: string; name: string | null };

  const lines = [
    `**Order ${order.referenceId}**`,
    `Status: ${order.status.toUpperCase()}`,
    `Customer: ${customer.name ?? 'Unknown'} (${customer.phone})`,
    `Order type: ${order.orderType ?? 'not specified'}`,
    `Placed: ${order.createdAt.toISOString()} (${timeAgo(order.createdAt)})`,
    ``,
    `**Items:**`,
    ...itemLines,
    ``,
    `**Total: ${order.totalPrice.toFixed(2)} ${currency}**`,
  ];

  if (order.deliveryAddress) {
    lines.push(`Delivery address: ${order.deliveryAddress}`);
  }
  if (order.deliveryNotes) {
    lines.push(`Delivery notes: ${order.deliveryNotes}`);
  }
  if (order.contactPhone) {
    lines.push(`Contact phone: ${order.contactPhone}`);
  }
  if (order.notes) {
    lines.push(`Order notes: ${order.notes}`);
  }

  return { success: true, result: lines.join('\n') };
}

interface UpdateOrderStatusArgs {
  referenceId: string;
  status: string;
}

export async function handleManagerUpdateOrderStatus(
  args: unknown,
  ctx: ManagerToolContext,
): Promise<ManagerToolResult> {
  const { referenceId, status } = args as UpdateOrderStatusArgs;

  if (!referenceId || typeof referenceId !== 'string') {
    return {
      success: false,
      result: 'referenceId is required.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
    return {
      success: false,
      result: `Invalid status "${status}". Must be one of: ${VALID_ORDER_STATUSES.join(', ')}.`,
      errorCode: 'VALIDATION_ERROR',
    };
  }

  // Scope lookup to this business
  const existing = await prisma.order.findFirst({
    where: { businessId: ctx.businessId, referenceId },
  });

  if (!existing) {
    return {
      success: false,
      result: `Order "${referenceId}" not found.`,
      errorCode: 'NOT_FOUND',
    };
  }

  const updated = await prisma.order.update({
    where: { id: existing.id },
    data: { status },
  });

  await createAuditLog({
    businessId: ctx.businessId,
    actorRef: `manager:${ctx.managerPhone}`,
    action: 'manager_agent:orders:status_update',
    resource: 'Order',
    resourceId: existing.id,
    details: {
      referenceId,
      previousStatus: existing.status,
      newStatus: status,
      managerId: ctx.managerId,
    },
  });

  return {
    success: true,
    result:
      `Order **${referenceId}** status updated: ${existing.status.toUpperCase()} → ${status.toUpperCase()}.\n` +
      `Updated at: ${updated.updatedAt.toISOString()}`,
  };
}
