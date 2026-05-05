import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/auth.js';

export async function businessContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'] as string;
  const apiKey = req.headers['x-api-key'] as string;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);

      if (!payload.businessId) {
        return res.status(403).json({ error: 'Platform users cannot access tenant API' });
      }

      const business = await prisma.business.findUnique({
        where: { id: payload.businessId },
        include: { settings: true },
      });

      if (!business) {
        return res.status(401).json({ error: 'Business not found' });
      }

      (req as any).business = business;
      (req as any).user = {
        id: payload.userId,
        businessId: payload.businessId,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'API key or JWT token required' });
  }

  const business = await prisma.business.findUnique({
    where: { apiKey },
    include: { settings: true },
  });

  if (!business) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  (req as any).business = business;
  next();
}
