import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';

const router = Router();

router.get('/', requirePlatformPermission('audit:cross-tenant'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (req.query.businessId) {
      where.businessId = req.query.businessId as string;
    }
    if (req.query.userId) {
      where.userId = req.query.userId as string;
    }
    if (req.query.action) {
      where.action = req.query.action as string;
    }
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from as string);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          business: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs.map(l => ({
        id: l.id,
        business: l.business,
        user: l.user,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        details: l.details ? (() => { try { return JSON.parse(l.details); } catch { return l.details; } })() : null,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
