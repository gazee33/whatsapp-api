import { prisma } from '../lib/prisma.js';
import type { AuditLogInput } from '../types/iam.js';

/**
 * Create an audit log entry.
 * Non-blocking: failures are logged but don't throw to avoid disrupting the main flow.
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: input.businessId,
        userId: input.userId || null,
        action: input.action,
        resource: input.resource || null,
        resourceId: input.resourceId || null,
        details: input.details ? JSON.stringify(input.details) : null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (error) {
    // Log but don't throw - audit failures shouldn't break the main flow
    console.error('Audit log creation failed:', error);
  }
}

/**
 * Get audit logs for a business with pagination.
 */
export async function getAuditLogs(
  businessId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    userId?: string;
  }
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const where: Record<string, unknown> = { businessId };
  if (options?.action) where.action = options.action;
  if (options?.userId) where.userId = options.userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}
