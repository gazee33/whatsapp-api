import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requirePermission } from '../middleware/permission.js';
import { createAuditLog } from '../services/audit.js';
import type { AuthRequest } from '../types/iam.js';

const router = Router();

router.get('/', requirePermission('roles:read'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!!;

    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { businessId },
          { businessId: null },
        ],
      },
      include: {
        _count: { select: { permissions: true, users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    res.json(roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      businessId: r.businessId,
      permissionCount: r._count.permissions,
      userCount: r._count.users,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })));
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.get('/:id', requirePermission('roles:read'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!!;
    const id = req.params.id as string;

    const role = await prisma.role.findFirst({
      where: {
        id,
        OR: [
          { businessId },
          { businessId: null },
        ],
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      businessId: role.businessId,
      permissions: role.permissions.map(p => ({
        id: p.permission.id,
        code: p.permission.code,
        name: p.permission.name,
        description: p.permission.description,
        category: p.permission.category,
      })),
      userCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

router.post('/', requirePermission('roles:create'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!!;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.role.findUnique({
      where: { businessId_name: { businessId, name } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Role with this name already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        businessId,
        isSystem: false,
      },
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'role:create',
      resource: 'Role',
      resourceId: role.id,
      details: { name: role.name },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.put('/:id', requirePermission('roles:update'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;
    const { name, description } = req.body;

    const existing = await prisma.role.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const role = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'role:update',
      resource: 'Role',
      resourceId: role.id,
      details: updateData,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/:id', requirePermission('roles:delete'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;

    const existing = await prisma.role.findFirst({
      where: { id, businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.userRole.deleteMany({ where: { roleId: id } });

    await prisma.role.delete({ where: { id } });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'role:delete',
      resource: 'Role',
      resourceId: id,
      details: { name: existing.name },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

router.post('/:id/permissions', requirePermission('roles:update'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;
    const { permissionIds } = req.body;

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds array is required' });
    }

    const role = await prisma.role.findFirst({
      where: { id, businessId },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    const rolePermissions = await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId: string) => ({
        roleId: id,
        permissionId,
      })),
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'role:assign-permissions',
      resource: 'Role',
      resourceId: id,
      details: { permissionIds },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json({ success: true, count: rolePermissions.count });
  } catch (error) {
    console.error('Assign permissions error:', error);
    res.status(500).json({ error: 'Failed to assign permissions' });
  }
});

router.delete('/:id/permissions/:permissionId', requirePermission('roles:update'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const businessId = authReq.user!.businessId!;
    const id = req.params.id as string;
    const permissionId = req.params.permissionId as string;

    const role = await prisma.role.findFirst({
      where: { id, businessId },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }

    const rolePermission = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: id, permissionId } },
    });

    if (!rolePermission) {
      return res.status(404).json({ error: 'Permission not assigned to role' });
    }

    await prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });

    await createAuditLog({
      businessId,
      userId: authReq.user!.id,
      action: 'role:revoke-permission',
      resource: 'Role',
      resourceId: id,
      details: { permissionId },
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke permission error:', error);
    res.status(500).json({ error: 'Failed to revoke permission' });
  }
});

export default router;