/**
 * campaigns.ts
 *
 * POST /api/campaigns/launch  — Upload CSV → create campaign → fire Bolna calls
 * GET  /api/campaigns         — Paginated list for the org
 * GET  /api/campaigns/:id     — Single campaign with stats
 * PATCH /api/campaigns/:id    — Update schedule / active hours / status
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { initiateCall } from '../lib/bolna';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ─── Multer: in-memory CSV (max 10 MB) ───────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// ─── Validation ───────────────────────────────────────────────────────────────
const LaunchSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  // agentId now refers to our local BolnaAgent.id (not the raw Bolna ID)
  agentId: z.string().min(1, 'BolnaAgent ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  createdById: z.string().min(1, 'Creator user ID is required'),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  activeHoursFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  activeHoursTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timeZone: z.string().default('UTC'),
});

// ─── POST /api/campaigns/launch ───────────────────────────────────────────────
router.post(
  '/launch',
  upload.single('contacts'),
  asyncHandler(async (req: Request, res: Response) => {
    // 1. Validate input
    const parsed = LaunchSchema.safeParse(req.body);
    if (!parsed.success) throw createError(parsed.error.message, 400);

    const {
      name,
      agentId,
      organizationId,
      createdById,
      scheduledStart,
      scheduledEnd,
      activeHoursFrom,
      activeHoursTo,
      timeZone,
    } = parsed.data;

    // 2. Validate org + agent (with tenant isolation)
    const [org, agent] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          isActive: true,
          creditBalance: true,
          creditLimit: true,
          creditUsed: true,
          bolnaApiKey: true,
          bolnaBaseUrl: true,
        },
      }),
      prisma.bolnaAgent.findFirst({
        where: { id: agentId, organizationId, status: 'ACTIVE' },
        select: { id: true, bolnaAgentId: true, fromNumber: true },
      }),
    ]);

    if (!org) throw createError('Organization not found', 404);
    if (!org.isActive) throw createError('Organization account is suspended', 403);
    if (!agent) throw createError('Agent not found or inactive', 404);

    // 3. Parse CSV
    if (!req.file) throw createError('CSV file is required', 400);

    const csvText = req.file.buffer.toString('utf-8');
    let rows: Record<string, string>[];
    try {
      rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      throw createError('Invalid CSV file', 400);
    }

    if (rows.length === 0) throw createError('CSV has no contacts', 400);

    // 4. Detect phone column
    const firstRow = rows[0];
    const phoneKey = Object.keys(firstRow).find((k) =>
      ['phoneNumber', 'phone_number', 'phone', 'Phone', 'PhoneNumber', 'mobile'].includes(k)
    );
    if (!phoneKey) {
      throw createError('CSV must have a column named "phoneNumber" or "phone"', 400);
    }

    // 5. Credit check — reserve 1 credit per contact
    const requiredCredits = rows.length; // 1 min per call (conservative)
    if (org.creditBalance < requiredCredits) {
      throw createError(
        `Insufficient credits. Need ${requiredCredits} min, have ${org.creditBalance.toFixed(2)} min.`,
        402
      );
    }

    // 6. Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name,
        bolnaAgentId: agent.id,
        organizationId,
        createdById,
        status: 'IN_PROGRESS',
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        activeHoursFrom,
        activeHoursTo,
        timeZone,
        totalContacts: rows.length,
      },
    });

    // 7. Fire calls concurrently (with rate-limit: 5 at a time)
    let processedCount = 0;
    let failedCount = 0;

    const CONCURRENCY = 5;
    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      chunks.push(rows.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (row) => {
          const phone = row[phoneKey].trim();
          if (!phone) return;

          const { [phoneKey]: _p, ...rest } = row;
          const metadata = Object.keys(rest).length ? rest : undefined;

          // Upsert contact
          const contact = await prisma.contact.upsert({
            where: { organizationId_phoneNumber: { organizationId, phoneNumber: phone } },
            create: {
              organizationId,
              phoneNumber: phone,
              name: row['Name'] ?? row['name'] ?? null,
              email: row['Email'] ?? row['email'] ?? null,
              metadata,
            },
            update: {},
          });

          // Create CallLog stub
          const callLog = await prisma.callLog.create({
            data: {
              campaignId: campaign.id,
              contactId: contact.id,
              agentId: agent.id,
              status: 'INITIATED',
            },
          });

          // Build variables from CSV row
          const variables: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            if (v) variables[k] = v;
          }

          // Fire Bolna call
          const callResponse = await initiateCall(
            {
              agent_id: agent.bolnaAgentId,
              recipient_phone_number: phone,
              from_phone_number: agent.fromNumber ?? undefined,
              user_data: variables,
            },
            org
          );

          // Update CallLog with Bolna call_id
          await prisma.callLog.update({
            where: { id: callLog.id },
            data: {
              bolnaCallId: callResponse.call_id,
              startedAt: new Date(),
            },
          });

          processedCount++;
        })
      );

      results.forEach((r) => {
        if (r.status === 'rejected') {
          failedCount++;
          console.error('[Campaign] Call failed:', r.reason?.message ?? r.reason);
        }
      });
    }

    // 8. Update campaign stats
    const finalStatus =
      failedCount === rows.length
        ? 'FAILED'
        : processedCount === rows.length
          ? 'COMPLETED'
          : 'IN_PROGRESS';

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { processedCount, failedCount, status: finalStatus },
    });

    res.status(201).json({
      success: true,
      data: {
        campaignId: campaign.id,
        totalContacts: rows.length,
        processed: processedCount,
        failed: failedCount,
        status: finalStatus,
      },
    });
  })
);

// ─── GET /api/campaigns ───────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, page = '1', limit = '20' } = req.query as Record<string, string>;
    if (!organizationId) throw createError('organizationId is required', 400);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { organizationId },
        include: {
          createdBy: { select: { name: true, email: true } },
          agent: { select: { name: true, voiceId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.campaign.count({ where: { organizationId } }),
    ]);

    res.json({ success: true, data: campaigns, total, page: parseInt(page) });
  })
);

// ─── GET /api/campaigns/:id ───────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        agent: { select: { name: true, voiceId: true, llmModel: true } },
        _count: { select: { callLogs: true } },
      },
    });
    if (!campaign) throw createError('Campaign not found', 404);

    // Real-time stats
    const stats = await prisma.callLog.groupBy({
      by: ['status'],
      where: { campaignId: campaign.id },
      _count: { id: true },
      _sum: { duration: true, creditCost: true },
    });

    res.json({ success: true, data: { ...campaign, stats } });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const UpdateSchema = z.object({
      activeHoursFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      activeHoursTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      scheduledStart: z.string().datetime().optional(),
      scheduledEnd: z.string().datetime().optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'FAILED']).optional(),
    });

    const p = UpdateSchema.safeParse(req.body);
    if (!p.success) throw createError(p.error.message, 400);

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        ...p.data,
        scheduledStart: p.data.scheduledStart ? new Date(p.data.scheduledStart) : undefined,
        scheduledEnd: p.data.scheduledEnd ? new Date(p.data.scheduledEnd) : undefined,
      },
    });

    res.json({ success: true, data: campaign });
  })
);

// ─── POST /api/campaigns/:id/pause ───────────────────────────────────────────
router.post(
  '/:id/pause',
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) throw createError('Campaign not found', 404);
    if (campaign.status !== 'IN_PROGRESS') {
      throw createError('Only running campaigns can be paused', 400);
    }
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' },
    });
    res.json({ success: true, data: updated });
  })
);

// ─── POST /api/campaigns/:id/resume ──────────────────────────────────────────
router.post(
  '/:id/resume',
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) throw createError('Campaign not found', 404);
    if (campaign.status !== 'PAUSED') {
      throw createError('Only paused campaigns can be resumed', 400);
    }
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS' },
    });
    res.json({ success: true, data: updated });
  })
);

export default router;

