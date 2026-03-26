/**
 * calls.ts
 *
 * POST /api/calls/initiate  — Validate tenant → check credits → proxy to Bolna
 * GET  /api/calls/logs      — Paginated call logs + transcripts + recordings
 * GET  /api/calls/:callId   — Single call detail (fetched live from Bolna)
 *
 * SECURITY MODEL:
 *  - The Bolna API key is NEVER exposed to the frontend.
 *  - All requests hit this backend which injects master credentials.
 *  - Every call is tied to an org_id and agent_id for strict tenant isolation.
 */

import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { initiateCall, getCallDetails } from '../lib/bolna';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

// ─── Validation Schema ────────────────────────────────────────────────────────
const InitiateCallSchema = z.object({
  /**
   * Local BolnaAgent.id (from our DB).
   * The backend looks up the bolnaAgentId from this — the frontend never
   * knows the real Bolna agent ID or API key.
   */
  agentId: z.string().min(1, 'agentId is required'),

  /** E.164 phone number e.g. "+919876543210" */
  recipientPhoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Must be a valid E.164 phone number'),

  /**
   * Dynamic variables injected as context into the agent's system prompt.
   * E.g. { "contact_name": "Priya", "product": "Pro Plan" }
   */
  variables: z.record(z.string()).optional().default({}),

  /**
   * Optional campaign context. If provided the call log is linked to it.
   * Omit for ad-hoc / test calls.
   */
  campaignId: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calls/initiate
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/initiate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // ── 1. Input validation ──────────────────────────────────────────────────
    const parsed = InitiateCallSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError(
        parsed.error.errors.map((e) => e.message).join('; '),
        400
      );
    }

    const { agentId, recipientPhoneNumber, variables, campaignId } = parsed.data;
    const organizationId = req.user!.organizationId;

    // ── 2. Tenant validation ─────────────────────────────────────────────────
    // Fetch the org and verify it is active and owns the requested agent.
    const [org, agent] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          isActive: true,
          creditBalance: true,
          creditLimit: true,
          creditUsed: true,
          bolnaApiKey: true,
          bolnaBaseUrl: true,
        },
      }),
      prisma.bolnaAgent.findFirst({
        where: {
          id: agentId,
          organizationId, // STRICT TENANT CHECK — agents cannot be cross-used
          status: 'ACTIVE',
        },
        select: {
          id: true,
          bolnaAgentId: true,
          name: true,
          fromNumber: true,
        },
      }),
    ]);

    if (!org) {
      throw createError('Organization not found', 404);
    }

    if (!org.isActive) {
      throw createError(
        'Your organization account has been suspended. Please contact support.',
        403
      );
    }

    if (!agent) {
      throw createError(
        'Agent not found or does not belong to your organization.',
        404
      );
    }

    // ── 3. Credit check ──────────────────────────────────────────────────────
    // Block the call if the org has consumed all credits.
    // We reserve 1 credit (minute) per call at initiation time;
    // the real deduction happens via webhook when the call ends.
    const CREDIT_RESERVE_PER_CALL = 1; // minutes

    if (org.creditBalance < CREDIT_RESERVE_PER_CALL) {
      throw createError(
        `Insufficient credits. Balance: ${org.creditBalance.toFixed(2)} min. ` +
          `Please top up your plan to continue making calls.`,
        402
      );
    }

    if (org.creditUsed >= org.creditLimit) {
      throw createError(
        `Monthly credit limit of ${org.creditLimit} minutes reached. ` +
          `Upgrade your plan or wait for the next billing cycle.`,
        402
      );
    }

    // ── 4. Resolve campaign (optional context) ───────────────────────────────
    let resolvedCampaign: { id: string; organizationId: string } | null = null;

    if (campaignId) {
      resolvedCampaign = await prisma.campaign.findFirst({
        where: { id: campaignId, organizationId }, // tenant isolation
        select: { id: true, organizationId: true },
      });

      if (!resolvedCampaign) {
        throw createError('Campaign not found or does not belong to your organization.', 404);
      }
    }

    // ── 5. Upsert contact ────────────────────────────────────────────────────
    // Every phone number gets a Contact record so we can track call history.
    const contact = await prisma.contact.upsert({
      where: {
        organizationId_phoneNumber: {
          organizationId,
          phoneNumber: recipientPhoneNumber,
        },
      },
      create: { organizationId, phoneNumber: recipientPhoneNumber },
      update: {}, // keep existing name/email if already in DB
    });

    // ── 6. Reserve credits optimistically ────────────────────────────────────
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: { decrement: CREDIT_RESERVE_PER_CALL },
        creditUsed: { increment: CREDIT_RESERVE_PER_CALL },
      },
    });

    // ── 7. Create a PENDING CallLog record ───────────────────────────────────
    const resolvedCampaignId = resolvedCampaign?.id ?? await _getDefaultCampaignId(organizationId);
    const callLog = await prisma.callLog.create({
      data: {
        campaignId: resolvedCampaignId,
        contactId: contact.id,
        agentId: agent.id,
        status: 'INITIATED',
        direction: 'outbound',
      },
    });

    // ── 8. Proxy request to Bolna API ────────────────────────────────────────
    // The Bolna API key is injected server-side — never touches the client.
    let bolnaResponse: Awaited<ReturnType<typeof initiateCall>>;

    try {
      bolnaResponse = await initiateCall(
        {
          agent_id: agent.bolnaAgentId,
          recipient_phone_number: recipientPhoneNumber,
          from_phone_number: agent.fromNumber ?? undefined,
          user_data: variables as Record<string, string>,
        },
        org // pass org credentials (falls back to env master key if not set)
      );
    } catch (err: unknown) {
      // ── Rollback: refund the reserved credit ──────────────────────────────
      await Promise.all([
        prisma.organization.update({
          where: { id: organizationId },
          data: {
            creditBalance: { increment: CREDIT_RESERVE_PER_CALL },
            creditUsed: { decrement: CREDIT_RESERVE_PER_CALL },
          },
        }),
        prisma.callLog.update({
          where: { id: callLog.id },
          data: { status: 'FAILED' },
        }),
      ]);

      const msg =
        (err as any)?.response?.data?.message ??
        (err as any)?.message ??
        'Failed to initiate call via Bolna';

      throw createError(`Bolna API error: ${msg}`, 502);
    }

    // ── 9. Persist Bolna call_id in CallLog ──────────────────────────────────
    const updatedLog = await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        bolnaCallId: bolnaResponse.call_id,
        status: 'INITIATED',
        startedAt: new Date(),
      },
    });

    // ── 10. Return response ───────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      data: {
        callLogId: updatedLog.id,
        bolnaCallId: bolnaResponse.call_id,
        status: bolnaResponse.status,
        recipientPhoneNumber,
        agent: { id: agent.id, name: agent.name },
        creditsRemaining: org.creditBalance - CREDIT_RESERVE_PER_CALL,
      },
    });
  })
);

// ─── Helper: resolve a default campaign for ad-hoc calls ─────────────────────
// Ad-hoc calls (no campaignId) still need a Campaign FK because our CallLog
// model requires one. We lazily create a "Direct Calls" campaign per org.
// In production you'd handle this with a nullable FK instead.
async function _getDefaultCampaignId(organizationId: string): Promise<string> {
  const SENTINEL_NAME = '__direct_calls__';

  let campaign = await prisma.campaign.findFirst({
    where: { organizationId, name: SENTINEL_NAME },
    select: { id: true },
  });

  if (!campaign) {
    // We need a valid agent and user to satisfy FK constraints.
    const [firstAgent, firstUser] = await Promise.all([
      prisma.bolnaAgent.findFirst({ where: { organizationId }, select: { id: true } }),
      prisma.user.findFirst({ where: { organizationId }, select: { id: true } }),
    ]);

    if (!firstAgent || !firstUser) {
      throw createError('No agent or user found for this organization', 500);
    }

    campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: SENTINEL_NAME,
        bolnaAgentId: firstAgent.id,
        createdById: firstUser.id,
        status: 'IN_PROGRESS',
        totalContacts: 0,
      },
      select: { id: true },
    });
  }

  return campaign.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calls/logs
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/logs',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      page = '1',
      limit = '25',
      campaignId,
      status,
      agentId,
      from,
      to,
    } = req.query as Record<string, string>;

    const organizationId = req.user!.organizationId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build dynamic filter
    const where: Record<string, unknown> = {
      campaign: { organizationId }, // tenant isolation via campaign join
    };

    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          contact: { select: { phoneNumber: true, name: true } },
          agent: { select: { name: true, voiceId: true } },
          campaign: { select: { name: true } },
        },
      }),
      prisma.callLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calls/:callId — single call (live data from Bolna)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/:callId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    // Fetch local record (enforces tenant isolation)
    const callLog = await prisma.callLog.findFirst({
      where: {
        bolnaCallId: req.params.callId,
        campaign: { organizationId },
      },
      include: {
        contact: true,
        agent: { select: { name: true, bolnaAgentId: true } },
        campaign: { select: { name: true } },
      },
    });

    if (!callLog) throw createError('Call not found', 404);

    // Enrich with live Bolna data (non-fatal)
    let liveData: unknown = null;
    if (callLog.bolnaCallId) {
      try {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { bolnaApiKey: true, bolnaBaseUrl: true },
        });
        liveData = await getCallDetails(callLog.bolnaCallId, org ?? undefined);
      } catch {
        /* swallow — return cached data */
      }
    }

    res.json({ success: true, data: { ...callLog, liveData } });
  })
);

export default router;
