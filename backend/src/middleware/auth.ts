import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/auth.js';
import type { AuthRequest, JwtPayload } from '../types/iam.js';

export interface AuthUser {
  id: string;
  businessId: string | null;
  email: string;
  name?: string;
  roles: string[];
  permissions: string[];
}

export async function getUserFromDb(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    return null;
  }

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.code)
  );

  return {
    id: user.id,
    businessId: user.businessId,
    email: user.email,
    name: user.name || undefined,
    roles,
    permissions,
  };
}

export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const user = await getUserFromDb(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isActive: true, lockedUntil: true },
    });

    if (!dbUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!dbUser.isActive) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
      res.status(403).json({ error: 'Account is locked' });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default auth;