import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const search = req.query.search as string | undefined;
    const sort = (req.query.sort as string) || 'recent';
    const flagged = req.query.flagged as string | undefined;

    const customers = await prisma.customer.findMany({
      where: {
        businessId,
        ...(flagged === 'true' ? { flaggedForSupport: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        orders: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            items: {
              include: {
                menuItem: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          select: { id: true },
        },
        complaints: {
          select: { id: true, status: true },
        },
      },
    });

    const mapped = customers.map((customer) => {
      const totalOrders = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, o) => sum + o.totalPrice, 0);
      const lastOrder = customer.orders[0];
      const totalMessages = customer.messages.length;
      const openComplaints = customer.complaints.filter((c) => c.status === 'open').length;

      const itemCounts: Record<string, { name: string; count: number }> = {};
      for (const order of customer.orders) {
        for (const item of order.items) {
          const key = item.menuItem.name;
          if (!itemCounts[key]) itemCounts[key] = { name: key, count: 0 };
          itemCounts[key].count++;
        }
      }
      const favoriteItem = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0]?.name || null;

      return {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        flaggedForSupport: customer.flaggedForSupport,
        createdAt: customer.createdAt,
        stats: {
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder?.createdAt || null,
          favoriteItem,
          totalMessages,
          openComplaints,
        },
      };
    });

    if (sort === 'name') {
      mapped.sort((a, b) => (a.name || a.phone).localeCompare(b.name || b.phone));
    } else if (sort === 'orders') {
      mapped.sort((a, b) => b.stats.totalOrders - a.stats.totalOrders);
    } else if (sort === 'spent') {
      mapped.sort((a, b) => b.stats.totalSpent - a.stats.totalSpent);
    } else {
      mapped.sort((a, b) => {
        const aDate = a.stats.lastOrderDate || a.createdAt;
        const bDate = b.stats.lastOrderDate || b.createdAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    }

    res.json(mapped);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;

    const customer = await prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        orders: {
          include: {
            items: {
              include: {
                menuItem: { select: { name: true, nameAr: true } },
                option: { select: { name: true, price: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        messages: {
          select: { id: true, role: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const totalOrders = customer.orders.length;
    const totalSpent = customer.orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const completedOrders = customer.orders.filter(
      (o) => o.status === 'delivered' || o.status === 'ready'
    );
    const firstOrder = customer.orders[customer.orders.length - 1];
    const lastOrder = customer.orders[0];
    const totalMessages = await prisma.message.count({ where: { customerId: id } });

    const itemCounts: Record<string, { name: string; count: number }> = {};
    for (const order of customer.orders) {
      for (const item of order.items) {
        const key = item.menuItem.name;
        if (!itemCounts[key]) itemCounts[key] = { name: key, count: 0 };
        itemCounts[key].count++;
      }
    }
    const favoriteItemEntries = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 3);

    const orderTypeBreakdown: Record<string, number> = {};
    for (const order of customer.orders) {
      const type = order.orderType || 'unknown';
      orderTypeBreakdown[type] = (orderTypeBreakdown[type] || 0) + 1;
    }

    const openComplaints = customer.complaints.filter((c) => c.status === 'open').length;

    res.json({
      customer: {
        id: customer.id,
        businessId: customer.businessId,
        phone: customer.phone,
        name: customer.name,
        flaggedForSupport: customer.flaggedForSupport,
        cartState: customer.cartState,
        createdAt: customer.createdAt,
      },
      stats: {
        totalOrders,
        totalSpent,
        avgOrderValue: totalOrders > 0 ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0,
        lastOrderDate: lastOrder?.createdAt || null,
        firstOrderDate: firstOrder?.createdAt || null,
        favoriteItems: favoriteItemEntries,
        orderTypeBreakdown,
        totalMessages,
        lastMessageDate: customer.messages[0]?.createdAt || null,
        openComplaints,
        completedOrders: completedOrders.length,
      },
      recentOrders: customer.orders.slice(0, 10).map((o) => ({
        id: o.id,
        referenceId: o.referenceId,
        status: o.status,
        totalPrice: o.totalPrice,
        orderType: o.orderType,
        items: o.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          option: i.option ? { name: i.option.name, price: i.option.price } : null,
        })),
        createdAt: o.createdAt,
      })),
      complaints: customer.complaints.slice(0, 10).map((c) => ({
        id: c.id,
        content: c.content,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;

    const customer = await prisma.customer.findFirst({
      where: { id, businessId },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [orders, messages, complaints] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: id },
        include: {
          items: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.message.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.complaint.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const timeline: Array<{
      type: 'order' | 'message' | 'complaint';
      date: string;
      data: Record<string, unknown>;
    }> = [];

    for (const order of orders) {
      timeline.push({
        type: 'order',
        date: order.createdAt.toISOString(),
        data: {
          id: order.id,
          referenceId: order.referenceId,
          status: order.status,
          totalPrice: order.totalPrice,
          orderType: order.orderType,
          items: order.items.map((i) => ({
            name: i.menuItem.name,
            quantity: i.quantity,
          })),
        },
      });
    }

    for (const message of messages) {
      timeline.push({
        type: 'message',
        date: message.createdAt.toISOString(),
        data: {
          id: message.id,
          role: message.role,
          content: message.content.length > 200 ? message.content.slice(0, 200) + '...' : message.content,
          sessionId: message.sessionId,
        },
      });
    }

    for (const complaint of complaints) {
      timeline.push({
        type: 'complaint',
        date: complaint.createdAt.toISOString(),
        data: {
          id: complaint.id,
          content: complaint.content,
          status: complaint.status,
        },
      });
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(timeline);
  } catch (error) {
    console.error('Get customer timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch customer timeline' });
  }
});

export default router;
