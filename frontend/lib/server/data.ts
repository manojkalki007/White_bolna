/**
 * lib/server/data.ts
 *
 * Server-side data fetching helpers.
 * These run ONLY on the server (Node.js runtime) — never in the browser.
 * They call the backend Express API directly using the internal base URL.
 *
 * Usage: import in Server Components or route handlers.
 */

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// ─── Shared fetch helper ──────────────────────────────────────────────────────
async function serverFetch<T>(path: string, token?: string): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // In Next.js 14+: revalidate every 30s (ISR-style caching)
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`[serverFetch] ${res.status} ${res.statusText} — ${url}`);
  }

  const json = await res.json();
  return (json.data ?? json) as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  totalCalls: number;
  completed: number;
  failed: number;
  noAnswer: number;
  busy: number;
  inProgress: number;
  connectionRate: number;
  avgDurationSeconds: number;
  totalMinutesUsed: number;
  avgLatencyMs: number;
  avgP95LatencyMs: number;
  totalCreditCost: number;
  totalCampaigns: number;
  statusBreakdown: { status: string; count: number; pct: number }[];
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  processedCount: number;
  failedCount: number;
  createdAt: string;
  agent?: { name: string };
}

export interface AgentSummary {
  id: string;
  name: string;
  status: string;
  llmModel: string;
  voiceProvider: string;
  createdAt: string;
}

export interface CallLogSummary {
  id: string;
  status: string;
  duration: number | null;
  createdAt: string;
  contact?: { name: string | null; phoneNumber: string };
  agent?: { name: string };
  campaign?: { name: string };
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchAnalytics(organizationId?: string): Promise<AnalyticsData> {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return serverFetch<AnalyticsData>(`/analytics${qs}`);
}

export async function fetchCampaigns(organizationId?: string, limit = 5): Promise<{ data: CampaignSummary[]; total: number }> {
  const qs = new URLSearchParams({ limit: String(limit), ...(organizationId ? { organizationId } : {}) });
  return serverFetch<{ data: CampaignSummary[]; total: number }>(`/campaigns?${qs}`);
}

export async function fetchAgents(organizationId?: string): Promise<AgentSummary[]> {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return serverFetch<AgentSummary[]>(`/agents${qs}`);
}

export async function fetchRecentCallLogs(organizationId?: string, limit = 8): Promise<{ data: CallLogSummary[]; total: number }> {
  const qs = new URLSearchParams({ limit: String(limit), ...(organizationId ? { organizationId } : {}) });
  return serverFetch<{ data: CallLogSummary[]; total: number }>(`/call-logs?${qs}`);
}
