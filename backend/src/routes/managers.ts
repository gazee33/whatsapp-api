import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createAuditLog } from '../services/audit.js';

const router = Router();

// Normalize phone: strip non-digits, drop a leading "+"
function normalizePhone(raw: string): string {
  return raw.trim().replace(/^\+/, '').replace(/\D/g, '');
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const managers = await prisma.manager.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ managers });
  } catch (error) {
    console.error('Manager list error:', error);
    res.status(500).json({ error: 'Failed to list managers' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const userId = (req as any).user?.id as string | undefined;
    const { phone, name, isOwner } = req.body || {};

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'phone is required' });
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 8) {
      return res.status(400).json({ error: 'phone must be at least 8 digits (E.164 without leading +)' });
    }

    const existing = await prisma.manager.findUnique({
      where: { businessId_phone: { businessId, phone: normalized } },
    });
    if (existing) {
      return res.status(409).json({ error: 'A manager with this phone already exists' });
    }

    const manager = await prisma.manager.create({
      data: {
        businessId,
        phone: normalized,
        name: name && typeof name === 'string' ? name.trim() : null,
        isOwner: !!isOwner,
      },
    });

    await createAuditLog({
      businessId,
      userId,
      action: 'manager:create',
      resource: 'Manager',
      resourceId: manager.id,
      details: { phone: normalized, name: manager.name, isOwner: manager.isOwner },
    });

    res.status(201).json({ manager });
  } catch (error) {
    console.error('Manager create error:', error);
    res.status(500).json({ error: 'Failed to create manager' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const userId = (req as any).user?.id as string | undefined;
    const id = String(req.params.id);

    const manager = await prisma.manager.findFirst({
      where: { id, businessId },
    });
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    await prisma.manager.delete({ where: { id } });

    await createAuditLog({
      businessId,
      userId,
      action: 'manager:delete',
      resource: 'Manager',
      resourceId: id,
      details: { phone: manager.phone, name: manager.name },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Manager delete error:', error);
    res.status(500).json({ error: 'Failed to delete manager' });
  }
});

export default router;
