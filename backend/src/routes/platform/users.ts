import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requirePlatformPermission } from '../../middleware/platform-permission.js';
import { hashPassword, validatePassword } from '../../lib/auth.js';

const router = Router();

router.get('/', requirePlatformPermission('users:platform-manage'), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { businessId: null },
      include: {
        roles: {
          include: {
            role: {
              select: { id: true, name: true, isSystem: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      roles: u.roles.map(ur => ur.role),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })));
  } catch (error) {
    console.error('List platform users error:', error);
    res.status(500).json({ error: 'Failed to fetch platform users' });
  }
});

router.post('/', requirePlatformPermission('users:platform-manage'), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'Invalid password', details: passwordValidation.errors });
    }

    const existing = await prisma.user.findFirst({
      where: { email, businessId: null },
    });

    if (existing) {
      return res.status(409).json({ error: 'Platform user with this email already exists' });
    }

    const platformAdminRole = await prisma.role.findFirst({
      where: { name: 'Platform Admin', isSystem: true },
    });

    if (!platformAdminRole) {
      return res.status(500).json({ error: 'Platform Admin role not found. Run seed first.' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        businessId: null,
        email,
        passwordHash,
        name: name || null,
        isActive: true,
        roles: {
          create: { roleId: platformAdminRole.id },
        },
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error('Create platform user error:', error);
    res.status(500).json({ error: 'Failed to create platform user' });
  }
});

router.delete('/:id', requirePlatformPermission('users:platform-manage'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findFirst({
      where: { id, businessId: null },
    });

    if (!user) {
      return res.status(404).json({ error: 'Platform user not found' });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke platform user error:', error);
    res.status(500).json({ error: 'Failed to revoke platform user' });
  }
});

export default router;
