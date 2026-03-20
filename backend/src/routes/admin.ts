/**
 * Admin Routes — SUPER_ADMIN only
 * Provides full org management: create, list, update credentials, deactivate.
 *
 * All routes are protected by `requireAuth` + `requireSuperAdmin`.
 * Regular org ADMIN users cannot access these endpoints.
 */

import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ─── Guard: SUPER_ADMIN only ─────────────────────────────────────────────────
function requireSuperAdmin(req: AuthRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Super admin access required' });
    return;
  }
  next();
}
router.use(requireSuperAdmin as any);

// ─── Schemas ─────────────────────────────────────────────────────────────────
const CreateOrgSchema = z.object({
  name: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  smallestAiApiKey: z.string().optional(),
  smallestAiBaseUrl: z.string().url().optional(),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).optional(),
  brandName: z.string().optional(),
  primaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

const UpdateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  smallestAiApiKey: z.string().optional(),
  smallestAiBaseUrl: z.string().url().optional().nullable(),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
  brandName: z.string().optional().nullable(),
  primaryColor: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  crmType: z.enum(['HUBSPOT', 'SALESFORCE', 'NONE']).optional().nullable(),
  crmAccessToken: z.string().optional().nullable(),
  crmRefreshToken: z.string().optional().nullable(),
  crmInstanceUrl: z.string().optional().nullable(),
});

// ─── GET /api/admin/orgs — list all orgs ──────────────────────────────────
router.get(
  '/orgs',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        brandName: true,
        primaryColor: true,
        logoUrl: true,
        crmType: true,
        // Never return API keys in list view
        smallestAiApiKey: false,
        createdAt: true,
        _count: { select: { users: true, campaigns: true } },
      },
    });
    res.json({ success: true, data: orgs });
  })
);

// ─── GET /api/admin/orgs/:id — single org detail ──────────────────────────
router.get(
  '/orgs/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        brandName: true,
        primaryColor: true,
        logoUrl: true,
        crmType: true,
        crmInstanceUrl: true,
        // Mask the API key — return only whether it's set
        smallestAiApiKey: true,
        smallestAiBaseUrl: true,
        createdAt: true,
        users: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        _count: { select: { campaigns: true, contacts: true } },
      },
    });

    res.json({
      success: true,
      data: {
        ...org,
        // Mask the actual key value but tell the UI whether it's configured
        smallestAiApiKey: org.smallestAiApiKey ? '••••••••' : null,
        hasSmallestAiKey: !!org.smallestAiApiKey,
      },
    });
  })
);

// ─── POST /api/admin/orgs — create a new org + admin user ─────────────────
router.post(
  '/orgs',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = CreateOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const {
      name,
      adminName,
      adminEmail,
      adminPassword,
      smallestAiApiKey,
      smallestAiBaseUrl,
      plan,
      brandName,
      primaryColor,
      logoUrl,
    } = parsed.data;

    // Check email not taken
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name,
          slug,
          smallestAiApiKey: smallestAiApiKey ?? null,
          smallestAiBaseUrl: smallestAiBaseUrl ?? null,
          plan: plan ?? 'STARTER',
          brandName: brandName ?? null,
          primaryColor: primaryColor ?? '#0d9488',
          logoUrl: logoUrl ?? null,
        },
      });
      await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          organizationId: newOrg.id,
          role: 'ADMIN',
        },
      });
      return newOrg;
    });

    res.status(201).json({ success: true, data: { id: org.id, name: org.name, slug: org.slug } });
  })
);

// ─── PATCH /api/admin/orgs/:id — update org settings / credentials ────────
router.patch(
  '/orgs/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = UpdateOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const data = parsed.data as Record<string, unknown>;

    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
        crmType: true,
        brandName: true,
        primaryColor: true,
      },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── DELETE /api/admin/orgs/:id — deactivate (soft delete) ───────────────
router.delete(
  '/orgs/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.organization.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Organization deactivated' });
  })
);

// ─── GET /api/admin/orgs/:id/users — list users in an org ─────────────────
router.get(
  '/orgs/:id/users',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      where: { organizationId: req.params.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  })
);

// ─── GET /api/admin/stats — platform-wide stats ───────────────────────────
router.get(
  '/stats',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const [totalOrgs, activeOrgs, totalUsers, totalCampaigns, totalCalls] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.callLog.count(),
    ]);

    const recentOrgs = await prisma.organization.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, plan: true, createdAt: true },
    });

    res.json({
      success: true,
      data: { totalOrgs, activeOrgs, totalUsers, totalCampaigns, totalCalls, recentOrgs },
    });
  })
);

export default router;
