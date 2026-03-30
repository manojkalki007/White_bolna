/**
 * callPoller.ts
 *
 * Background polling engine — replaces webhooks for local development.
 *
 * Runs every POLL_INTERVAL_MS (default 30s). Finds all CallLogs in
 * pending/active states, polls Bolna's GET /call/{id} for each one,
 * and updates the database with real status, duration, transcript, etc.
 *
 * Automatically deactivates itself if BOLNA_WEBHOOK_SECRET is set AND
 * NODE_ENV is "production" (i.e. webhooks are handling updates instead).
 *
 * Usage: call startCallPoller() once at server startup.
 */

import prisma from './prisma';
import { getCallDetails } from './bolna';
import { uploadRecordingFromUrl } from './storage';

// ─── Configuration ────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS    = parseInt(process.env.CALL_POLL_INTERVAL_MS ?? '30000', 10);
const MAX_PENDING_RETRIES = parseInt(process.env.CALL_POLL_MAX_RETRIES  ?? '40',   10); // ~20 min
const CONCURRENCY         = 5; // max simultaneous Bolna API calls per cycle

// Terminal states — stop polling once a call is in one of these
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED']);

// Bolna call status → our DB enum
const BOLNA_TO_DB_STATUS: Record<string, string> = {
  initiated:   'INITIATED',
  ringing:     'RINGING',
  in_progress: 'IN_CALL',
  completed:   'COMPLETED',
  failed:      'FAILED',
  no_answer:   'NO_ANSWER',
  busy:        'BUSY',
  cancelled:   'CANCELLED',
};

// ─── Per-call retry counter (in-memory, reset on server restart) ─────────────
const retryCount = new Map<string, number>();

// ─── Main polling cycle ───────────────────────────────────────────────────────
async function pollCycle() {
  // Find all non-terminal call logs that have a Bolna call ID
  const pendingLogs = await prisma.callLog.findMany({
    where: {
      bolnaCallId: { not: null },
      status: { notIn: [...TERMINAL_STATUSES] as any[] },
    },
    include: {
      campaign: {
        select: {
          id: true,
          organizationId: true,
          totalContacts: true,
          processedCount: true,
          failedCount: true,
          name: true,
          organization: {
            select: {
              bolnaApiKey: true,
              bolnaBaseUrl: true,
            },
          },
        },
      },
    },
    take: 100, // safety cap: at most 100 live calls per cycle
  });

  if (pendingLogs.length === 0) return;

  console.log(`[CallPoller] 🔄 Polling ${pendingLogs.length} active call(s)…`);

  // Process in batches of CONCURRENCY
  for (let i = 0; i < pendingLogs.length; i += CONCURRENCY) {
    const batch = pendingLogs.slice(i, i + CONCURRENCY);

    await Promise.allSettled(
      batch.map(async (log) => {
        const callId = log.bolnaCallId!;

        // Abort if we've retried too many times (avoids polling zombie calls forever)
        const retries = retryCount.get(callId) ?? 0;
        if (retries >= MAX_PENDING_RETRIES) {
          console.warn(`[CallPoller] Max retries reached for ${callId} — marking FAILED`);
          retryCount.delete(callId);
          await prisma.callLog.update({
            where: { id: log.id },
            data: { status: 'FAILED' as any, disconnectReason: 'poller_max_retries' },
          });
          await reconcileCampaignCounters(log.campaign!.id, false);
          return;
        }

        try {
          const orgCreds = log.campaign?.organization ?? {};
          const details = await getCallDetails(callId, orgCreds);

          const rawStatus  = (details?.status as string | undefined)?.toLowerCase() ?? '';
          const dbStatus   = BOLNA_TO_DB_STATUS[rawStatus] ?? null;
          const isTerminal = dbStatus ? TERMINAL_STATUSES.has(dbStatus) : false;

          // Build update payload
          const updateData: Record<string, unknown> = {};

          if (dbStatus && dbStatus !== log.status) {
            updateData.status = dbStatus;
          }
          if (details?.duration !== undefined) {
            updateData.duration = Number(details.duration);
          }
          if (details?.recording_url) {
            updateData.bolnaRecordingUrl = details.recording_url as string;
          }
          if (details?.transcript) {
            updateData.transcript = details.transcript as string;
          }
          if (details?.disconnect_reason) {
            updateData.disconnectReason = details.disconnect_reason as string;
          }
          if (details?.latency) {
            const latency = details.latency as Record<string, unknown>;
            if (latency.avg_ms !== undefined) updateData.avgLatencyMs = Number(latency.avg_ms);
            if (latency.p95_ms !== undefined) updateData.p95LatencyMs = Number(latency.p95_ms);
          }
          if (details?.post_call_data) {
            updateData.postCallMetrics = details.post_call_data as any;
          }
          if (rawStatus === 'in_progress' && !log.startedAt) {
            updateData.startedAt = new Date();
          }
          if (isTerminal && !log.endedAt) {
            updateData.endedAt = new Date();
          }

          // Persist only if there are real changes
          if (Object.keys(updateData).length > 0) {
            await prisma.callLog.update({
              where: { id: log.id },
              data: updateData as any,
            });
          }

          // If terminal — reconcile credits + upload recording + update campaign
          if (isTerminal && log.campaign?.organizationId) {
            retryCount.delete(callId);
            const durationSec = Number(details?.duration ?? 0);
            const durationMin = durationSec / 60;
            const CREDIT_RESERVED = 1;
            const refund      = Math.max(0, CREDIT_RESERVED - durationMin);
            const extraCharge = Math.max(0, durationMin - CREDIT_RESERVED);

            // Reconcile credits
            await prisma.organization.update({
              where: { id: log.campaign.organizationId },
              data: {
                creditBalance: { increment: refund - extraCharge },
                creditUsed:    { increment: extraCharge - refund },
              },
            });

            // Upload recording to Supabase Storage (if available)
            const recUrl = details?.recording_url as string | undefined;
            if (recUrl) {
              try {
                const stored = await uploadRecordingFromUrl(
                  recUrl,
                  log.campaign.organizationId,
                  callId
                );
                if (stored) {
                  await prisma.callLog.update({
                    where: { id: log.id },
                    data: { recordingUrl: stored.publicUrl },
                  });
                  console.log(`[CallPoller] 📼 Recording saved: ${stored.path}`);
                }
              } catch (err) {
                console.warn(`[CallPoller] Recording upload failed for ${callId}:`, err);
              }
            }

            // Update campaign counters
            const isSuccess = dbStatus === 'COMPLETED';
            await reconcileCampaignCounters(log.campaign.id, isSuccess);

            console.log(`[CallPoller] ✅ ${callId} → ${dbStatus} (${durationSec}s)`);
          } else {
            // Still active — increment retry counter
            retryCount.set(callId, retries + 1);
          }
        } catch (err: any) {
          // Don't crash the whole cycle if a single call lookup fails
          const statusCode = err?.response?.status;
          if (statusCode === 404) {
            // Bolna doesn't know this call — it was likely never fired
            console.warn(`[CallPoller] call_id=${callId} not found in Bolna (404) — marking FAILED`);
            retryCount.delete(callId);
            await prisma.callLog.update({
              where: { id: log.id },
              data: { status: 'FAILED' as any, disconnectReason: 'not_found_in_bolna' },
            });
            if (log.campaign?.id) await reconcileCampaignCounters(log.campaign.id, false);
          } else {
            console.error(`[CallPoller] Error polling ${callId}:`, err?.message ?? err);
            retryCount.set(callId, retries + 1);
          }
        }
      })
    );
  }
}

// ─── Campaign counter reconciliation ─────────────────────────────────────────
async function reconcileCampaignCounters(campaignId: string, success: boolean) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: success
      ? { processedCount: { increment: 1 } }
      : { failedCount:    { increment: 1 } },
  });

  // Auto-complete campaign when all contacts resolved
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { totalContacts: true, processedCount: true, failedCount: true, name: true },
  });

  if (campaign) {
    const done = campaign.processedCount + campaign.failedCount;
    if (campaign.totalContacts > 0 && done >= campaign.totalContacts) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' },
      });
      console.log(`[CallPoller] 🎉 Campaign "${campaign.name}" COMPLETED`);
    }
  }
}

// ─── Poller lifecycle ─────────────────────────────────────────────────────────
let pollerTimer: NodeJS.Timeout | null = null;

export function startCallPoller() {
  // If webhooks are configured AND we're in production, skip polling
  const webhookSecret = process.env.BOLNA_WEBHOOK_SECRET;
  const isProduction  = process.env.NODE_ENV === 'production';

  if (webhookSecret && isProduction) {
    console.log('[CallPoller] 🔔 Webhook mode active — polling engine disabled');
    return;
  }

  console.log(`[CallPoller] ▶️  Starting (interval: ${POLL_INTERVAL_MS / 1000}s)`);

  // Run first cycle after 10s (give the server a moment to fully start)
  setTimeout(async () => {
    await pollCycle().catch(console.error);
    pollerTimer = setInterval(() => pollCycle().catch(console.error), POLL_INTERVAL_MS);
  }, 10_000);
}

export function stopCallPoller() {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
    console.log('[CallPoller] ⏹️  Stopped');
  }
}
