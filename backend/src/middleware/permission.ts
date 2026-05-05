import type { AuthRequest } from '../types/iam.js';
import type { Request, Response, NextFunction } from 'express';

export function requirePermission(...codes: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) return next();
    const hasAll = codes.every(code => authReq.user!.permissions.includes(code));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions', required: codes });
    }
    next();
  };
}

export function requireAnyPermission(...codes: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) return next();
    const hasAny = codes.some(code => authReq.user!.permissions.includes(code));
    if (!hasAny) {
      return res.status(403).json({ error: 'Insufficient permissions', required: codes });
    }
    next();
  };
}