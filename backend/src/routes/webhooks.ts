/**
 * webhooks.ts
 *
 * POST /api/webhooks/bolna — Receives post-call data from Bolna servers.
 *
 * Security:
 *  - HMAC-SHA256 signature verification using BOLNA_WEBHOOK_SECRET env var.
 *  - All processing is async and non-blocking (responds 200 immediately).
 *  - Raw payload archived in WebhookEvent for replay/debugging.
 *
 * Bolna webhook shape (v1):
 * {
 *   event: "call.initiated" | "call.ringing" | "call.started" |
 *           "call.completed" | "call.failed" | "call.no_answer" | "call.busy"
 *   data: {
 *     call_id: string
 *     status: string
 *     duration: number          // seconds
 *     recording_url: string
 *     transcript: string
 *     disconnect_reason: string
 *     latency: {
 *       avg_ms: number
 *       p95_ms: number
 *     }
 *     post_call_data: {
 *       sentiment: string
 *       intent: string
 *       summary: string
 *       [key: string]: unknown
 *     }
 *   }
 * }
 */

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { createHmac, timingSafeEqual } from 'crypto';
import prisma from '../lib/prisma';
import { uploadRecordingFromUrl } from '../lib/storage';
import { createError } from '../middleware/errorHandler';

const router = Router();

// ─── HMAC Signature Verification ─────────────────────────────────────────────
function verifyBolnaSignature(
  rawBody: string,
  signature: string | undefined
): boolean {
  const secret = process.env.BOLNA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook/Bolna] BOLNA_WEBHOOK_SECRET not set — skipping verification in dev');
    return true;
  }
  if (!signature) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const incoming = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(incoming, 'hex'));
  } catch {
    return false;
  }
}

// ─── Bolna event → CallStatus mapping ────────────────────────────────────────
const EVENT_STATUS_MAP: Record<string, string> = {
  'call.initiated': 'INITIATED',
  'call.ringing':   'RINGING',
  'call.started':   'IN_CALL',
  'call.completed': 'COMPLETED',
  'call.failed':    'FAILED',
  'call.no_answer': 'NO_ANSWER',
  'call.busy':      'BUSY',
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/bolna
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/bolna',
  asyncHandler(async (req: Request, res: Response) => {
    const rawBody: string =
      (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    const signature = req.headers['x-bolna-signature'] as string | undefined;

    // ── Signature check ────────────────────────────────────────────────────
    if (!verifyBolnaSignature(rawBody, signature)) {
      throw createError('Invalid webhook signature', 401);
    }

    const payload = req.body as Record<string, unknown>;
    const event = (payload.event as string) ?? 'unknown';
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const bolnaCallId = (data.call_id ?? data.callId) as string | undefined;

    console.log(`[Webhook/Bolna] event="${event}" call_id="${bolnaCallId}"`);

    // ── Archive raw event immediately ──────────────────────────────────────
    const webhookRecord = await prisma.webhookEvent.create({
      data: {
        source: 'bolna',
        eventType: event,
        bolnaCallId: bolnaCallId ?? null,
        payload: payload as any,
        processed: false,
      },
    });

    // ── Respond 200 immediately so Bolna doesn't retry ────────────────────
    res.status(200).json({ received: true, id: webhookRecord.id });

    // ── Process asynchronously (after response is sent) ───────────────────
    // This pattern prevents Bolna from timing out waiting for our DB ops.
    setImmediate(() => processBolnaEvent(webhookRecord.id, event, data, bolnaCallId));
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Async event processor (runs after HTTP response)
// ─────────────────────────────────────────────────────────────────────────────
async function processBolnaEvent(
  webhookId: string,
  event: string,
  data: Record<string, unknown>,
  bolnaCallId: string | undefined
) {
  try {
    if (!bolnaCallId) {
      console.warn(`[Webhook/Bolna] No call_id in payload, skipping (id=${webhookId})`);
      await prisma.webhookEvent.update({
        where: { id: webhookId },
        data: { processed: true, error: 'No call_id' },
      });
      return;
    }

    // Locate our CallLog
    const callLog = await prisma.callLog.findUnique({
      where: { bolnaCallId },
      include: {
        campaign: {
          select: {
            id: true,
            organizationId: true,
            totalContacts: true,
            processedCount: true,
            failedCount: true,
          },
        },
      },
    });

    if (!callLog) {
      console.warn(`[Webhook/Bolna] No CallLog for call_id=${bolnaCallId}`);
      await prisma.webhookEvent.update({
        where: { id: webhookId },
        data: { processed: true, error: 'No matching CallLog' },
      });
      return;
    }

    const newStatus = (EVENT_STATUS_MAP[event] ?? callLog.status) as any;

    // ── Build CallLog update data ──────────────────────────────────────────
    const updateData: Record<string, unknown> = {
      status: newStatus,
      rawWebhookPayload: data,
    };

    if (data.duration !== undefined) updateData.duration = Number(data.duration);
    if (data.recording_url)        updateData.bolnaRecordingUrl = data.recording_url;
    if (data.transcript)           updateData.transcript = data.transcript;
    if (data.disconnect_reason)    updateData.disconnectReason = data.disconnect_reason;

    // Latency metrics
    const latency = data.latency as Record<string, unknown> | undefined;
    if (latency) {
      if (latency.avg_ms !== undefined) updateData.avgLatencyMs = Number(latency.avg_ms);
      if (latency.p95_ms !== undefined) updateData.p95LatencyMs = Number(latency.p95_ms);
    }

    // Structured post-call analytics
    if (data.post_call_data) updateData.postCallMetrics = data.post_call_data;

    // Timestamps
    if (event === 'call.started')    updateData.startedAt = new Date();
    if (event === 'call.completed' ||
        event === 'call.failed' ||
        event === 'call.no_answer' ||
        event === 'call.busy')       updateData.endedAt = new Date();

    // ── Credit deduction (on call.completed) ──────────────────────────────
    // Duration arrives in seconds; our credit unit is minutes.
    const isTerminal = ['call.completed', 'call.failed', 'call.no_answer', 'call.busy'].includes(event);

    if (isTerminal && callLog.campaign?.organizationId) {
      const durationSec = Number(data.duration ?? 0);
      const durationMin = durationSec / 60;
      const CREDIT_RESERVED = 1; // what we reserved at initiation

      updateData.creditCost = durationMin;

      // Reconcile: refund the difference between what was reserved and actual usage
      const refund = Math.max(0, CREDIT_RESERVED - durationMin);
      const extraCharge = Math.max(0, durationMin - CREDIT_RESERVED);

      await prisma.organization.update({
        where: { id: callLog.campaign.organizationId },
        data: {
          creditBalance: { increment: refund - extraCharge },
          creditUsed: { increment: extraCharge - refund },
        },
      });

      // ── Upload recording to Supabase Storage ──────────────────────────────
      const bolnaRecUrl = data.recording_url as string | undefined;
      if (bolnaRecUrl && callLog.bolnaCallId) {
        const stored = await uploadRecordingFromUrl(
          bolnaRecUrl,
          callLog.campaign.organizationId,
          callLog.bolnaCallId
        );
        if (stored) {
          updateData.recordingUrl = stored.publicUrl;
          console.log(`[Webhook/Bolna] Recording uploaded to Supabase: ${stored.path}`);
        }
      }
    }

    // ── Persist CallLog update ─────────────────────────────────────────────
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: updateData as any,
    });

    // ── Update Campaign counters ───────────────────────────────────────────
    if (isTerminal && callLog.campaign) {
      const isSuccess = event === 'call.completed';

      await prisma.campaign.update({
        where: { id: callLog.campaign.id },
        data: isSuccess
          ? { processedCount: { increment: 1 } }
          : { failedCount: { increment: 1 } },
      });

      // Mark campaign COMPLETED when all contacts are resolved
      const updated = await prisma.campaign.findUnique({
        where: { id: callLog.campaign.id },
        select: { totalContacts: true, processedCount: true, failedCount: true, name: true },
      });

      if (updated) {
        const done = updated.processedCount + updated.failedCount;
        if (updated.totalContacts > 0 && done >= updated.totalContacts) {
          await prisma.campaign.update({
            where: { id: callLog.campaign.id },
            data: { status: 'COMPLETED' },
          });
          console.log(`[Webhook/Bolna] Campaign "${updated.name}" marked COMPLETED`);
        }
      }
    }

    // Mark webhook as processed
    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: { processed: true },
    });

    console.log(`[Webhook/Bolna] Processed event="${event}" call_id="${bolnaCallId}"`);
  } catch (err) {
    console.error('[Webhook/Bolna] Processing error:', err);
    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: { error: String(err) },
    }).catch(() => {}); // don't throw — this is fire-and-forget
  }
}

export default router;
