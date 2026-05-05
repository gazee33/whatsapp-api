import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requirePermission } from '../middleware/permission.js';
import { validatePassword, hashPassword } from '../lib/auth.js';
import { createAuditLog } from '../services/audit.js';
import type { AuthRequest } from '../types/iam.js';

const router = Router();

function sanitizeUser(user: any) {
  const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user;
  return safe;
}

router.get('/', requirePermission('users:read'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const { search, isActive, role } = req.query;

    const where: any = { businessId };

    if (search) {
      where.OR = [
        { email: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let filteredUsers = users;
    if (role) {
      filteredUsers = users.filter(u =>
        u.roles.some(r => r.role.name.toLowerCase() === (role as string).toLowerCase())
      );
    }

    res.json(filteredUsers.map(u => ({
      ...sanitizeUser(u),
      roles: u.roles.map(r => ({
        id: r.role.id,
        name: r.role.name,
        description: r.role.description,
        isSystem: r.role.isSystem,
        conditions: r.role.conditions,
        createdAt: r.role.createdAt,
        updatedAt: r.role.updatedAt,
      })),
    })));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', requirePermission('users:read'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;

    const user = await prisma.user.findFirst({
      where: { id, businessId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/', requirePermission('users:create'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid password', details: validation.errors });
    }

    const existing = await prisma.user.findUnique({
      where: { businessId_email: { businessId, email } },
    });

    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        businessId,
      },
    });

    const staffRole = await prisma.role.findFirst({
      where: { businessId, name: 'Staff' },
    });

    if (staffRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: staffRole.id,
        },
      });
    }

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'user:create',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, name: user.name },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;
    const { name, isActive } = req.body;

    if (authReq.user!.id === id) {
      return res.status(403).json({ error: 'Cannot modify your own account' });
    }

    const existing = await prisma.user.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'user:update',
      resource: 'User',
      resourceId: user.id,
      details: updateData,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', requirePermission('users:delete'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;

    if (authReq.user!.id === id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    const existing = await prisma.user.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'user:delete',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/:id/roles', requirePermission('users:assign-roles'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    const user = await prisma.user.findFirst({
      where: { id, businessId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (role && role.businessId !== null && role.businessId !== businessId) {
      return res.status(403).json({ error: 'Role does not belong to this business' });
    }

    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: id, roleId } },
    });

    if (existing) {
      return res.status(409).json({ error: 'User already has this role' });
    }

    const userRole = await prisma.userRole.create({
      data: { userId: id, roleId },
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'user:assign-role',
      resource: 'UserRole',
      resourceId: userRole.id,
      details: { userId: id, roleId },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.status(201).json(userRole);
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

router.delete('/:id/roles/:roleId', requirePermission('users:assign-roles'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;
    const roleId = req.params.roleId as string;

    const user = await prisma.user.findFirst({
      where: { id, businessId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: id, roleId } },
    });

    if (!userRole) {
      return res.status(404).json({ error: 'User does not have this role' });
    }

    await prisma.userRole.delete({
      where: { id: userRole.id },
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'user:revoke-role',
      resource: 'UserRole',
      resourceId: userRole.id,
      details: { userId: id, roleId },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke role error:', error);
    res.status(500).json({ error: 'Failed to revoke role' });
  }
});

export default router;