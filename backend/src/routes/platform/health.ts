import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';

const router = Router();

router.get('/', requirePlatformPermission('platform:read'), async (req: Request, res: Response) => {
  const checks: Record<string, any> = {
    server: { status: 'ok', uptime: process.uptime(), nodeVersion: process.version, memoryUsage: process.memoryUsage() },
  };

  // DB connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (err) {
    checks.database = { status: 'error', error: String(err) };
  }

  // Order stats as a lightweight health indicator
  try {
    const orderCount = await prisma.order.count();
    const businessCount = await prisma.business.count();
    checks.stats = { totalOrders: orderCount, totalBusinesses: businessCount };
  } catch (err) {
    checks.stats = { status: 'error', error: String(err) };
  }

  const allOk = Object.values(checks).every((c: any) => c.status === 'ok' || c.status === undefined);
  const statusCode = allOk ? 200 : 503;

  res.status(statusCode).json(checks);
});

export default router;
