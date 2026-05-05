import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/auth.js';

export async function platformContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'] as string;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Platform access requires Bearer JWT token' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (payload.businessId !== null) {
      return res.status(403).json({ error: 'Platform access only — user has a business scope' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Account not found or disabled' });
    }

    (req as any).platformUser = {
      id: payload.userId,
      businessId: null,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
