import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';

const router = Router();

router.get('/', requirePlatformPermission('businesses:read'), async (req: Request, res: Response) => {
  try {
    const search = req.query.q as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { whatsappPhoneNumber: { contains: search } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true, customers: true, users: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      data: businesses.map(b => ({
        id: b.id,
        name: b.name,
        whatsappPhoneNumber: b.whatsappPhoneNumber,
        whatsappPhoneNumberId: b.whatsappPhoneNumberId,
        apiKey: b.apiKey,
        orderCount: b._count.orders,
        customerCount: b._count.customers,
        userCount: b._count.users,
        createdAt: b.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List businesses error:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

router.post('/', requirePlatformPermission('businesses:create'), async (req: Request, res: Response) => {
  try {
    const { name, whatsappPhoneNumber, whatsappPhoneNumberId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    const apiKey = `biz-${crypto.randomUUID()}`;

    const business = await prisma.business.create({
      data: {
        name,
        apiKey,
        whatsappPhoneNumber,
        whatsappPhoneNumberId,
      },
    });

    res.status(201).json({
      id: business.id,
      name: business.name,
      apiKey: business.apiKey,
      whatsappPhoneNumber: business.whatsappPhoneNumber,
      whatsappPhoneNumberId: business.whatsappPhoneNumberId,
      createdAt: business.createdAt,
    });
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

router.get('/:id', requirePlatformPermission('businesses:read'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, customers: true, users: true, complaints: true } },
        settings: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({
      id: business.id,
      name: business.name,
      whatsappPhoneNumber: business.whatsappPhoneNumber,
      whatsappPhoneNumberId: business.whatsappPhoneNumberId,
      apiKey: business.apiKey,
      settings: business.settings,
      orderCount: business._count.orders,
      customerCount: business._count.customers,
      userCount: business._count.users,
      complaintCount: business._count.complaints,
      createdAt: business.createdAt,
    });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

router.put('/:id', requirePlatformPermission('businesses:manage'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, whatsappPhoneNumber, whatsappPhoneNumberId } = req.body;

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (whatsappPhoneNumber !== undefined) updateData.whatsappPhoneNumber = whatsappPhoneNumber;
    if (whatsappPhoneNumberId !== undefined) updateData.whatsappPhoneNumberId = whatsappPhoneNumberId;

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
    });

    res.json(business);
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

router.delete('/:id', requirePlatformPermission('businesses:manage'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Business not found' });
    }

    await prisma.business.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

router.get('/:id/stats', requirePlatformPermission('businesses:read'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const days = Math.max(1, parseInt(req.query.days as string) || 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const [totalOrders, recentOrders, totalRevenue, orderStatusCounts] = await Promise.all([
      prisma.order.count({ where: { businessId: id } }),
      prisma.order.count({ where: { businessId: id, createdAt: { gte: since } } }),
      prisma.order.aggregate({ where: { businessId: id, status: { not: 'cancelled' } }, _sum: { totalPrice: true } }),
      prisma.order.groupBy({ by: ['status'], where: { businessId: id }, _count: true }),
    ]);

    res.json({
      businessId: id,
      totalOrders,
      ordersLast30Days: recentOrders,
      totalRevenue: totalRevenue._sum?.totalPrice ?? 0,
      orderStatusBreakdown: Object.fromEntries(
        orderStatusCounts.map(s => [s.status, s._count])
      ),
    });
  } catch (error) {
    console.error('Get business stats error:', error);
    res.status(500).json({ error: 'Failed to fetch business stats' });
  }
});

export default router;
