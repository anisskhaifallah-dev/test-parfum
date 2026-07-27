import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staffId?: string;
      staffRole?: string;
    }
  }
}

// Every route behind this is staff-only (admin/customer service) - customers never hit these.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.staffId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const staff = await prisma.adminUser.findUnique({ where: { id: req.staffId } });
  if (!staff || staff.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }
  req.staffRole = staff.role;
  next();
}
