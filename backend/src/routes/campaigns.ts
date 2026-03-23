import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { initiateCall } from '../lib/smallestai';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Multer: accept CSV in memory (max 10 MB)
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

// ─── Validation schema ────────────────────────────────────────────────────────
const LaunchSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  agentId: z.string().min(1, 'Smallest.ai Agent ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  createdById: z.string().min(1, 'Creator user ID is required'),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  activeHoursFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "HH:MM"
  activeHoursTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timeZone: z.string().default('UTC'),
});

// ─── POST /api/campaigns/launch ───────────────────────────────────────────────
router.post(
  '/launch',
  upload.single('contacts'),
  asyncHandler(async (req: Request, res: Response) => {
    // 1. Validate body fields
    const parsed = LaunchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(parsed.error.message, 400);
    }

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

    // 2. Parse CSV
    if (!req.file) throw createError('CSV file is required', 400);

    const csvText = req.file.buffer.toString('utf-8');
    let rows: Record<string, string>[];
    try {
      rows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw createError('Invalid CSV file', 400);
    }

    if (rows.length === 0) throw createError('CSV has no contacts', 400);

    // Ensure phoneNumber column exists
    const firstRow = rows[0];
    const phoneKey = Object.keys(firstRow).find((k) =>
      ['phoneNumber', 'phone_number', 'phone', 'Phone', 'PhoneNumber'].includes(k)
    );
    if (!phoneKey) {
      throw createError(
        'CSV must have a column named "phoneNumber" or "phone"',
        400
      );
    }

    // 3. Create campaign in DB
    const campaign = await prisma.campaign.create({
      data: {
        name,
        smallestAgentId: agentId,
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

    // 4. Upsert contacts + create CallLog stubs, then fire calls
    let processedCount = 0;
    let failedCount = 0;

    const callResults = await Promise.allSettled(
      rows.map(async (row) => {
        const phone = row[phoneKey].trim();
        if (!phone) return;

        // Extract extra columns as metadata
        const { [phoneKey]: _p, ...rest } = row;
        const metadata = Object.keys(rest).length ? rest : undefined;

        // Find or create contact
        let contact = await prisma.contact.findFirst({
          where: { organizationId, phoneNumber: phone },
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              organizationId,
              phoneNumber: phone,
              name: row['Name'] ?? row['name'] ?? undefined,
              email: row['Email'] ?? row['email'] ?? undefined,
              metadata,
            },
          });
        }

        // Create a pending CallLog
        const callLog = await prisma.callLog.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            status: 'INITIATED',
          },
        });

        // Build variables from row columns
        const variables: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          if (v) variables[k] = v;
        }

        // Fire Smallest.ai call
        const callResponse = await initiateCall({
          agent_id: agentId,
          phone_number: phone,
          variables,
        });

        // Update CallLog with smallest_ai_call_id
        // initiateCall() already unwraps res.data, so the call_id is at the top level
        const callId = callResponse.call_id ?? callResponse.callId;
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            smallestAiCallId: callId,
            startedAt: new Date(),
          },
        });

        processedCount++;
      })
    );

    // Count failures
    callResults.forEach((r) => {
      if (r.status === 'rejected') {
        failedCount++;
        console.error('[Campaign] Call failed:', r.reason);
      }
    });

    // Update campaign stats
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

// ─── GET /api/campaigns — list all campaigns for an org ─────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, page = '1', limit = '20' } = req.query as Record<string, string>;
    if (!organizationId) throw createError('organizationId is required', 400);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { organizationId },
        include: { createdBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.campaign.count({ where: { organizationId } }),
    ]);

    res.json({ success: true, data: campaigns, total, page: parseInt(page) });
  })
);

// ─── GET /api/campaigns/:id — single campaign with stats ─────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { callLogs: true } },
      },
    });
    if (!campaign) throw createError('Campaign not found', 404);
    res.json({ success: true, data: campaign });
  })
);

// ─── PATCH /api/campaigns/:id — update schedule / active hours ───────────────
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

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) throw createError(parsed.error.message, 400);

    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        scheduledStart: parsed.data.scheduledStart
          ? new Date(parsed.data.scheduledStart)
          : undefined,
        scheduledEnd: parsed.data.scheduledEnd
          ? new Date(parsed.data.scheduledEnd)
          : undefined,
      },
    });

    res.json({ success: true, data: campaign });
  })
);

export default router;
