import { Router, Request, Response } from 'express';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';
import { prisma } from '../../lib/prisma.js';
import { VALID_TONE_PRESETS } from '../../services/ai-rules-validation.js';

const router = Router();

function validatePresetBody(body: Record<string, unknown>): string | null {
  const { name, tonePreset, defaultCustomInstructions } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return 'name is required and must be a non-empty string.';
    }
    if (name.length > 100) {
      return 'name must be at most 100 characters.';
    }
  }

  if (tonePreset !== undefined) {
    if (!(VALID_TONE_PRESETS as readonly string[]).includes(tonePreset as string)) {
      return `tonePreset must be one of: ${VALID_TONE_PRESETS.join(', ')}.`;
    }
  }

  if (defaultCustomInstructions !== undefined) {
    if (typeof defaultCustomInstructions !== 'string') {
      return 'defaultCustomInstructions must be a string.';
    }
    if (defaultCustomInstructions.length > 500) {
      return 'defaultCustomInstructions must be at most 500 characters.';
    }
  }

  return null;
}

// GET /api/platform/presets — list all presets with business count
router.get(
  '/',
  requirePlatformPermission('platform:read'),
  async (_req: Request, res: Response) => {
    try {
      const presets = await prisma.onboardingPreset.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { businesses: true } },
        },
      });
      res.json(presets);
    } catch (error) {
      console.error('List presets error:', error);
      res.status(500).json({ error: 'Failed to fetch presets' });
    }
  },
);

// POST /api/platform/presets — create a new preset
router.post(
  '/',
  requirePlatformPermission('platform:settings'),
  async (req: Request, res: Response) => {
    try {
      const { name, description, tonePreset, defaultCustomInstructions } = req.body;

      // name is required on create
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'name is required.', field: 'name' });
      }

      const validationError = validatePresetBody(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const preset = await prisma.onboardingPreset.create({
        data: {
          name: name.trim(),
          description: description ?? '',
          tonePreset: tonePreset ?? 'casual',
          defaultCustomInstructions: defaultCustomInstructions ?? '',
        },
        include: {
          _count: { select: { businesses: true } },
        },
      });

      res.status(201).json(preset);
    } catch (error) {
      console.error('Create preset error:', error);
      res.status(500).json({ error: 'Failed to create preset' });
    }
  },
);

// GET /api/platform/presets/:id — get single preset
router.get(
  '/:id',
  requirePlatformPermission('platform:read'),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const preset = await prisma.onboardingPreset.findUnique({
        where: { id },
        include: {
          _count: { select: { businesses: true } },
        },
      });

      if (!preset) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      res.json(preset);
    } catch (error) {
      console.error('Get preset error:', error);
      res.status(500).json({ error: 'Failed to fetch preset' });
    }
  },
);

// PUT /api/platform/presets/:id — update preset
router.put(
  '/:id',
  requirePlatformPermission('platform:settings'),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.onboardingPreset.findUnique({
        where: { id },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      const validationError = validatePresetBody(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const { name, description, tonePreset, defaultCustomInstructions, isActive } = req.body;

      const preset = await prisma.onboardingPreset.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: (name as string).trim() }),
          ...(description !== undefined && { description }),
          ...(tonePreset !== undefined && { tonePreset }),
          ...(defaultCustomInstructions !== undefined && { defaultCustomInstructions }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          _count: { select: { businesses: true } },
        },
      });

      res.json(preset);
    } catch (error) {
      console.error('Update preset error:', error);
      res.status(500).json({ error: 'Failed to update preset' });
    }
  },
);

// DELETE /api/platform/presets/:id — soft delete (set isActive = false)
router.delete(
  '/:id',
  requirePlatformPermission('platform:settings'),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const existing = await prisma.onboardingPreset.findUnique({
        where: { id },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Preset not found' });
      }

      await prisma.onboardingPreset.update({
        where: { id },
        data: { isActive: false },
      });

      res.status(204).end();
    } catch (error) {
      console.error('Delete preset error:', error);
      res.status(500).json({ error: 'Failed to delete preset' });
    }
  },
);

export default router;
