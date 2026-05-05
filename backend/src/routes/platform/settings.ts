import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';

const router = Router();

router.get('/', requirePlatformPermission('platform:read'), async (req: Request, res: Response) => {
  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const s of settings) {
      try {
        result[s.key] = JSON.parse(s.value);
      } catch {
        result[s.key] = s.value;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Get platform settings error:', error);
    res.status(500).json({ error: 'Failed to fetch platform settings' });
  }
});

router.put('/', requirePlatformPermission('platform:settings'), async (req: Request, res: Response) => {
  try {
    const settings = req.body as Record<string, any>;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Request body must be an object of key-value pairs' });
    }

    const keys = Object.keys(settings);
    for (const key of keys) {
      const value = JSON.stringify(settings[key]);
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const updated = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
    const result: Record<string, any> = {};
    for (const s of updated) {
      try {
        result[s.key] = JSON.parse(s.value);
      } catch {
        result[s.key] = s.value;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Update platform settings error:', error);
    res.status(500).json({ error: 'Failed to update platform settings' });
  }
});

export default router;
