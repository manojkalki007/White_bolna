/**
 * settings.ts
 *
 * PATCH /api/settings/org  — Update own org settings (bolnaApiKey, branding, name)
 * GET   /api/settings/org  — Get own org settings
 */

import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const SettingsSchema = z.object({
  name:           z.string().min(1).optional(),
  bolnaApiKey:    z.string().optional(),
  bolnaBaseUrl:   z.string().url().optional(),
  brandName:      z.string().optional(),
  primaryColor:   z.string().optional(),
  logoUrl:        z.string().optional(),
}).strict();

// ─── GET /api/settings/org ────────────────────────────────────────────────────
router.get(
  '/org',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.user!.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        creditBalance: true,
        creditUsed: true,
        creditLimit: true,
        bolnaApiKey: true,
        bolnaBaseUrl: true,
        brandName: true,
        primaryColor: true,
        logoUrl: true,
        customDomain: true,
        createdAt: true,
      },
    });

    if (!org) {
      res.status(404).json({ success: false, error: 'Organization not found' });
      return;
    }

    // Mask API key — don't expose raw key to frontend
    const masked = org.bolnaApiKey
      ? org.bolnaApiKey.slice(0, 8) + '•'.repeat(24)
      : null;

    res.json({ success: true, data: { ...org, bolnaApiKey: masked } });
  })
);

// ─── PATCH /api/settings/org ──────────────────────────────────────────────────
router.patch(
  '/org',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    // Prevent bolnaApiKey from being written blank (must provide or omit)
    const updateData = { ...parsed.data };
    if (updateData.bolnaApiKey === '') delete updateData.bolnaApiKey;

    const org = await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: updateData,
      select: { id: true, name: true, slug: true, plan: true, brandName: true, primaryColor: true },
    });

    res.json({ success: true, data: org });
  })
);

export default router;
