import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

export const newsletterRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

newsletterRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required');

    await prisma.newsletterSignup.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase() },
      update: {},
    });

    res.status(201).json({ ok: true });
  })
);
