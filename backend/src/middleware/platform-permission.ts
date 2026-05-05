import type { Request, Response, NextFunction } from 'express';

export function requirePlatformPermission(...codes: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const platformUser = (req as any).platformUser;
    if (!platformUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const hasAll = codes.every(code => platformUser.permissions.includes(code));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions', required: codes });
    }
    next();
  };
}
