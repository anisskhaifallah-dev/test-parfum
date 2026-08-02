import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rate-limit.js';

// Staff-only. There is no public registration - customers never see this, and the
// first admin account is created by the seed script (see prisma/seed.ts).
export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) throw new HttpError(400, 'email and password are required');

    const staff = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!staff) throw new HttpError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, staff.passwordHash);
    if (!valid) throw new HttpError(401, 'Invalid email or password');

    const token = signToken({ userId: staff.id });
    res.json({ token, staff: { id: staff.id, email: staff.email, name: staff.name, role: staff.role } });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const staff = await prisma.adminUser.findUnique({ where: { id: req.staffId } });
    if (!staff) throw new HttpError(404, 'Staff account not found');
    res.json({ id: staff.id, email: staff.email, name: staff.name, role: staff.role });
  })
);

// Admin-only: provision another staff (admin or agent) account. No self-service signup.
authRouter.post(
  '/staff',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    if (!email || !password) throw new HttpError(400, 'email and password are required');
    if (password.length < 8) throw new HttpError(400, 'password must be at least 8 characters');
    if (role && role !== 'admin' && role !== 'agent') throw new HttpError(400, "role must be 'admin' or 'agent'");

    const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new HttpError(409, 'A staff account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const staff = await prisma.adminUser.create({
      data: { email: email.toLowerCase(), passwordHash, name, role: role ?? 'agent' },
    });

    res.status(201).json({ id: staff.id, email: staff.email, name: staff.name, role: staff.role });
  })
);
