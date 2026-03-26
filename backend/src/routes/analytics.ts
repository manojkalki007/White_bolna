import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import prisma from '../lib/prisma';

const router = Router();

// ─── GET /api/analytics?organizationId=... ────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.query as Record<string, string>;

    const where = organizationId ? { campaign: { organizationId } } : {};

    const [totalCalls, statusCounts, durationAgg, campaignStats] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.groupBy({ by: ['status'], where, _count: { status: true } }),
      prisma.callLog.aggregate({
        where: { ...where, status: 'COMPLETED', duration: { not: null } },
        _avg: { duration: true },
        _sum: { duration: true },
        _max: { duration: true },
      }),
      prisma.campaign.count({ where: organizationId ? { organizationId } : {} }),
    ]);

    // ── Bolna-specific metrics via raw SQL (new columns after migration) ──────
    type LatencyRow = { avg_latency: number | null; avg_p95: number | null; max_latency: number | null };
    type CreditRow  = { total_credit: number | null };

    const orgFilter = organizationId
      ? `AND c."organizationId" = '${organizationId.replace(/'/g, "''")}' `
      : '';

    const [latencyRows, creditRows] = await Promise.all([
      prisma.$queryRawUnsafe<LatencyRow[]>(`
        SELECT AVG(cl."avgLatencyMs") AS avg_latency,
               AVG(cl."p95LatencyMs") AS avg_p95,
               MAX(cl."avgLatencyMs") AS max_latency
        FROM "CallLog" cl
        JOIN "Campaign" c ON c.id = cl."campaignId"
        WHERE cl."avgLatencyMs" IS NOT NULL ${orgFilter}
      `),
      prisma.$queryRawUnsafe<CreditRow[]>(`
        SELECT SUM(cl."creditCost") AS total_credit
        FROM "CallLog" cl
        JOIN "Campaign" c ON c.id = cl."campaignId"
        WHERE 1=1 ${orgFilter}
      `),
    ]).catch(() => [[{ avg_latency: null, avg_p95: null, max_latency: null }], [{ total_credit: null }]] as [LatencyRow[], CreditRow[]]);

    const latency = latencyRows[0];
    const credit  = creditRows[0];

    const completed  = statusCounts.find((s) => s.status === 'COMPLETED')?._count.status ?? 0;
    const failed     = statusCounts.find((s) => s.status === 'FAILED')?._count.status ?? 0;
    const noAnswer   = statusCounts.find((s) => s.status === 'NO_ANSWER')?._count.status ?? 0;
    const busy       = statusCounts.find((s) => s.status === 'BUSY')?._count.status ?? 0;
    const inProgress = statusCounts.find((s) => s.status === 'IN_CALL')?._count.status ?? 0;

    res.json({
      success: true,
      data: {
        totalCalls,
        completed,
        failed,
        noAnswer,
        busy,
        inProgress,
        connectionRate: totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0,
        avgDurationSeconds: Math.round(durationAgg._avg.duration ?? 0),
        totalMinutesUsed: Math.round((durationAgg._sum.duration ?? 0) / 60),
        maxDurationSeconds: durationAgg._max.duration ?? 0,
        avgLatencyMs:     Math.round(Number(latency?.avg_latency ?? 0)),
        avgP95LatencyMs:  Math.round(Number(latency?.avg_p95 ?? 0)),
        maxLatencyMs:     Math.round(Number(latency?.max_latency ?? 0)),
        totalCreditCost:  Number((Number(credit?.total_credit ?? 0)).toFixed(3)),
        totalCampaigns:   campaignStats,
        statusBreakdown:  statusCounts.map((s) => ({
          status: s.status,
          count: s._count.status,
          pct: totalCalls > 0 ? Math.round((s._count.status / totalCalls) * 100) : 0,
        })),
      },
    });
  })
);

export default router;
