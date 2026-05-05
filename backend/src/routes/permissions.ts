import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const permissions = await prisma.permission.findMany({
      ...(category ? { where: { category: category as string } } : {}),
      orderBy: { code: 'asc' },
    });

    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    }

    res.json({
      permissions: grouped,
      flat: permissions.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
      })),
    });
  } catch (error) {
    console.error('List permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

export default router;