import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import prisma from '../lib/prisma';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ─── GET /api/call-logs?campaignId=...&organizationId=...&page=1&limit=20 ─────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      campaignId,
      organizationId,
      status,
      agentId,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    // req.user is guaranteed by requireAuth
    const user = (req as any).user;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (campaignId) where.campaignId = campaignId;
    if (status)     where.status = status;
    if (agentId)    where.agentId = agentId;

    // Tenant Isolation
    if (user.role === 'SUPER_ADMIN') {
      if (organizationId) where.campaign = { organizationId };
    } else {
      where.campaign = { organizationId: user.organizationId };
    }

    const [logs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          contact: { select: { name: true, phoneNumber: true, email: true } },
          agent:   { select: { name: true, voiceId: true, llmModel: true } },
          campaign: { select: { name: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.callLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  })
);

// ─── GET /api/call-logs/:id — single log with full transcript ─────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const log = await prisma.callLog.findUnique({
      where: { id: req.params.id },
      include: {
        contact:  true,
        agent:    { select: { name: true, voiceId: true, llmModel: true, bolnaAgentId: true } },
        campaign: { select: { name: true, organizationId: true } },
      } as any,
    });
    
    if (!log) throw createError('Call log not found', 404);
    
    // Tenant Authorization validation
    if (user.role !== 'SUPER_ADMIN' && log.campaign?.organizationId !== user.organizationId) {
      throw createError('Access denied: Action isolated to owning tenant.', 403);
    }
    
    res.json({ success: true, data: log });
  })
);

export default router;
