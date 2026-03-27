/**
 * admin.ts — SUPER_ADMIN only
 *
 * GET    /api/admin/orgs             — List all tenants
 * GET    /api/admin/orgs/:id         — Single tenant detail
 * POST   /api/admin/orgs             — Create org + admin user
 * PATCH  /api/admin/orgs/:id         — Update org settings / credentials
 * DELETE /api/admin/orgs/:id         — Soft-deactivate org
 * GET    /api/admin/orgs/:id/users   — Users in org
 * GET    /api/admin/stats            — Platform-wide stats
 * GET    /api/admin/metrics          — System health + Bolna API uptime
 * PATCH  /api/admin/orgs/:id/credits — Manually adjust credit balance
 */

import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// ─── Guard: SUPER_ADMIN only ──────────────────────────────────────────────────
function requireSuperAdmin(req: AuthRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Super admin access required' });
    return;
  }
  next();
}
router.use(requireSuperAdmin as any);

// ─── Schemas ──────────────────────────────────────────────────────────────────
const CreateOrgSchema = z.object({
  name: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  bolnaApiKey: z.string().optional(),
  bolnaBaseUrl: z.string().url().optional(),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).optional(),
  creditBalance: z.number().nonnegative().optional(),
  creditLimit: z.number().positive().optional(),
  brandName: z.string().optional(),
  primaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  customDomain: z.string().optional(),
});

const UpdateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  bolnaApiKey: z.string().optional().nullable(),
  bolnaBaseUrl: z.string().url().optional().nullable(),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
  brandName: z.string().optional().nullable(),
  primaryColor: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  customDomain: z.string().optional().nullable(),
  crmType: z.enum(['HUBSPOT', 'SALESFORCE', 'NONE']).optional().nullable(),
  crmAccessToken: z.string().optional().nullable(),
  crmRefreshToken: z.string().optional().nullable(),
  crmInstanceUrl: z.string().optional().nullable(),
});

const AdjustCreditsSchema = z.object({
  delta: z.number(), // positive = add, negative = subtract
  reason: z.string().optional(),
});

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'USER', 'VIEWER', 'SUPER_ADMIN']).default('ADMIN'),
});

// ─── GET /api/admin/orgs ──────────────────────────────────────────────────────
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
        creditBalance: true,
        creditUsed: true,
        creditLimit: true,
        createdAt: true,
        _count: { select: { users: true, campaigns: true, agents: true } },
      },
    });

    // Aggregate call stats per org
    const callStats = await prisma.callLog.groupBy({
      by: ['campaignId'],
      _count: { id: true },
      _sum: { duration: true, creditCost: true },
    });

    const campaigns = await prisma.campaign.findMany({
      select: { id: true, organizationId: true },
    });
    const campaignOrgMap: Record<string, string> = {};
    for (const c of campaigns) campaignOrgMap[c.id] = c.organizationId;

    const orgCallMap: Record<string, { calls: number; durationSec: number; creditCost: number }> = {};
    for (const row of callStats) {
      const orgId = campaignOrgMap[row.campaignId];
      if (!orgId) continue;
      if (!orgCallMap[orgId]) orgCallMap[orgId] = { calls: 0, durationSec: 0, creditCost: 0 };
      orgCallMap[orgId].calls += row._count.id;
      orgCallMap[orgId].durationSec += row._sum.duration ?? 0;
      orgCallMap[orgId].creditCost += row._sum.creditCost ?? 0;
    }

    const enriched = orgs.map((org) => ({
      ...org,
      calls: orgCallMap[org.id]?.calls ?? 0,
      durationMin: Math.round((orgCallMap[org.id]?.durationSec ?? 0) / 60),
      creditConsumed: orgCallMap[org.id]?.creditCost ?? 0,
    }));

    res.json({ success: true, data: enriched });
  })
);

// ─── GET /api/admin/orgs/:id ──────────────────────────────────────────────────
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
        customDomain: true,
        crmType: true,
        crmInstanceUrl: true,
        creditBalance: true,
        creditUsed: true,
        creditLimit: true,
        bolnaApiKey: true,
        bolnaBaseUrl: true,
        stripeCustomerId: true,
        createdAt: true,
        users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        _count: { select: { campaigns: true, contacts: true, agents: true } },
      },
    });

    res.json({
      success: true,
      data: {
        ...org,
        // Mask actual key — only expose whether it's set
        bolnaApiKey: org.bolnaApiKey ? '••••••••' : null,
        hasBolnaKey: !!org.bolnaApiKey,
      },
    });
  })
);

// ─── POST /api/admin/orgs ─────────────────────────────────────────────────────
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
      bolnaApiKey,
      bolnaBaseUrl,
      plan,
      creditBalance,
      creditLimit,
      brandName,
      primaryColor,
      logoUrl,
      customDomain,
    } = parsed.data;

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
          bolnaApiKey: bolnaApiKey ?? null,
          bolnaBaseUrl: bolnaBaseUrl ?? null,
          plan: plan ?? 'STARTER',
          creditBalance: creditBalance ?? 100,
          creditLimit: creditLimit ?? 500,
          brandName: brandName ?? null,
          primaryColor: primaryColor ?? '#6366f1',
          logoUrl: logoUrl ?? null,
          customDomain: customDomain ?? null,
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

// ─── PATCH /api/admin/orgs/:id ────────────────────────────────────────────────
router.patch(
  '/orgs/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = UpdateOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: parsed.data as any,
      select: {
        id: true,
        name: true,
        plan: true,
        isActive: true,
        crmType: true,
        brandName: true,
        primaryColor: true,
        customDomain: true,
        creditBalance: true,
        creditLimit: true,
      },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── DELETE /api/admin/orgs/:id — soft deactivate ─────────────────────────────
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

// ─── GET /api/admin/orgs/:id/users ────────────────────────────────────────────
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

// ─── POST /api/admin/orgs/:id/users ───────────────────────────────────────────
router.post(
  '/orgs/:id/users',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use across the platform' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        organizationId: req.params.id,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  })
);

// ─── PATCH /api/admin/orgs/:id/credits — manual credit adjustment ─────────────
router.patch(
  '/orgs/:id/credits',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = AdjustCreditsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const { delta } = parsed.data;

    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        creditBalance: { increment: delta },
        // If adding credits, also raise creditUsed ceiling accordingly
        ...(delta < 0 ? { creditUsed: { decrement: Math.abs(delta) } } : {}),
      },
      select: { id: true, creditBalance: true, creditUsed: true, creditLimit: true },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const [totalOrgs, activeOrgs, totalUsers, totalCampaigns, totalCalls, totalAgents] =
      await Promise.all([
        prisma.organization.count(),
        prisma.organization.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.campaign.count(),
        prisma.callLog.count(),
        prisma.bolnaAgent.count({ where: { status: 'ACTIVE' } }),
      ]);

    // Credit usage summary
    const creditAgg = await prisma.organization.aggregate({
      _sum: { creditUsed: true, creditBalance: true },
    });

    // Call success rate
    const [completed, failed] = await Promise.all([
      prisma.callLog.count({ where: { status: 'COMPLETED' } }),
      prisma.callLog.count({ where: { status: 'FAILED' } }),
    ]);

    const recentOrgs = await prisma.organization.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, plan: true, createdAt: true },
    });

    // Webhook success rate (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [processedWebhooks, failedWebhooks] = await Promise.all([
      prisma.webhookEvent.count({ where: { processed: true, createdAt: { gte: since } } }),
      prisma.webhookEvent.count({ where: { processed: false, createdAt: { gte: since } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrgs,
        activeOrgs,
        totalUsers,
        totalCampaigns,
        totalCalls,
        totalAgents,
        totalCreditsUsed: creditAgg._sum.creditUsed ?? 0,
        totalCreditsRemaining: creditAgg._sum.creditBalance ?? 0,
        callSuccessRate:
          totalCalls > 0 ? ((completed / totalCalls) * 100).toFixed(1) + '%' : 'N/A',
        completed,
        failed,
        webhooks: {
          processed: processedWebhooks,
          failed: failedWebhooks,
          successRate:
            processedWebhooks + failedWebhooks > 0
              ? (
                  (processedWebhooks / (processedWebhooks + failedWebhooks)) *
                  100
                ).toFixed(1) + '%'
              : 'N/A',
        },
        recentOrgs,
      },
    });
  })
);

// ─── GET /api/admin/metrics — system health + Bolna API uptime ────────────────
router.get(
  '/metrics',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Check Bolna API health
    let bolnaStatus: 'operational' | 'degraded' | 'down' = 'down';
    let bolnaLatencyMs = 0;

    try {
      const t0 = Date.now();
      await axios.get(`${process.env.BOLNA_BASE_URL ?? 'https://api.bolna.dev'}/health`, {
        timeout: 5000,
        headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` },
      });
      bolnaLatencyMs = Date.now() - t0;
      bolnaStatus = bolnaLatencyMs < 1000 ? 'operational' : 'degraded';
    } catch {
      bolnaStatus = 'down';
    }

    // DB health
    let dbStatus: 'operational' | 'down' = 'down';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'operational';
    } catch {
      dbStatus = 'down';
    }

    // Recent error logs (failed webhooks)
    const recentErrors = await prisma.webhookEvent.findMany({
      where: { processed: false, error: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, eventType: true, bolnaCallId: true, error: true, createdAt: true },
    });

    // Active calls (in-progress right now)
    const activeCalls = await prisma.callLog.count({
      where: { status: { in: ['INITIATED', 'RINGING', 'IN_CALL'] } },
    });

    // Calls in last hour
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const callsLastHour = await prisma.callLog.count({
      where: { createdAt: { gte: lastHour } },
    });

    res.json({
      success: true,
      data: {
        services: {
          bolna: { status: bolnaStatus, latencyMs: bolnaLatencyMs },
          database: { status: dbStatus },
          api: { status: 'operational' },
        },
        realtime: {
          activeCalls,
          callsLastHour,
        },
        errors: {
          recentWebhookFailures: recentErrors,
        },
        timestamp: new Date().toISOString(),
      },
    });
  })
);

export default router;
