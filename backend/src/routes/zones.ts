import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/zones - List all delivery zones
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const zones = await prisma.deliveryZone.findMany({
      where: { businessId },
      orderBy: { deliveryFee: 'asc' },
    });
    res.json(zones);
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// POST /api/zones - Create a delivery zone
router.post('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const { name, description, deliveryFee, minimumOrder, isActive } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Zone name is required' });
      return;
    }

    const zone = await prisma.deliveryZone.create({
      data: {
        businessId,
        name,
        description,
        deliveryFee: deliveryFee ?? 0,
        minimumOrder: minimumOrder != null ? Number(minimumOrder) : null,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json(zone);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A zone with this name already exists' });
      return;
    }
    console.error('Create zone error:', error);
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// PUT /api/zones/:id - Update a delivery zone
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, description, deliveryFee, minimumOrder, isActive } = req.body;

    const zone = await prisma.deliveryZone.findFirst({
      where: { id, businessId },
    });

    if (!zone) {
      res.status(404).json({ error: 'Zone not found' });
      return;
    }

    const updated = await prisma.deliveryZone.update({
      where: { id: id },
      data: {
        name,
        description,
        deliveryFee,
        minimumOrder: minimumOrder != null ? Number(minimumOrder) : null,
        isActive,
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A zone with this name already exists' });
      return;
    }
    console.error('Update zone error:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

// DELETE /api/zones/:id - Delete a delivery zone
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;

    const zone = await prisma.deliveryZone.findFirst({
      where: { id, businessId },
    });

    if (!zone) {
      res.status(404).json({ error: 'Zone not found' });
      return;
    }

    await prisma.deliveryZone.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete zone error:', error);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

export default router;
