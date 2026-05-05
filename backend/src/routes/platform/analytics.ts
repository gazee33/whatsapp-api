import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';

const router = Router();

router.get('/', requirePlatformPermission('platform:read'), async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalBusinesses,
      totalOrders,
      totalRevenue,
      recentOrders,
      topBusinesses,
      ordersByDay,
      orderStatusCounts,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.order.count(),
      prisma.order.aggregate({ where: { status: { not: 'cancelled' } }, _sum: { totalPrice: true } }),
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.order.groupBy({
        by: ['businessId'],
        _count: { id: true },
        _sum: { totalPrice: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      (async () => {
        const raw: Array<{ date: string; count: number }> = await prisma.$queryRawUnsafe(`
          SELECT DATE(createdAt) as date, COUNT(*) as count
          FROM "Order"
          WHERE createdAt >= ?
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `, since);
        return raw.map(r => ({ date: r.date, orderCount: Number(r.count) }));
      })(),
      prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);

    const topBusinessIds = topBusinesses.map(b => b.businessId);
    const businessNames = topBusinessIds.length > 0
      ? await prisma.business.findMany({
          where: { id: { in: topBusinessIds } },
          select: { id: true, name: true },
        })
      : [];
    const businessNameMap = new Map(businessNames.map(b => [b.id, b.name]));

    const totalComplaints = await prisma.complaint.count();
    const recentComplaints = await prisma.complaint.count({ where: { createdAt: { gte: since } } });

    res.json({
      summary: {
        totalBusinesses,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
        ordersLast30Days: recentOrders,
        totalComplaints,
        complaintsLast30Days: recentComplaints,
      },
      ordersByDay,
      orderStatusBreakdown: Object.fromEntries(
        orderStatusCounts.map(s => [s.status, s._count])
      ),
      topBusinesses: topBusinesses.map(b => ({
        businessId: b.businessId,
        businessName: businessNameMap.get(b.businessId) || 'Unknown',
        orderCount: b._count.id,
        revenue: b._sum.totalPrice || 0,
      })),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
