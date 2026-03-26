'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import {
  Phone, CheckCircle2, Clock, TrendingUp,
  Megaphone, XCircle, PhoneMissed, Zap, ArrowUpRight,
} from 'lucide-react';

interface AnalyticsData {
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
  totalCreditCost: number;
  totalCampaigns: number;
  statusBreakdown: { status: string; count: number; pct: number }[];
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  COMPLETED: { color: '#22c55e', label: 'Completed' },
  FAILED:    { color: '#ef4444', label: 'Failed' },
  NO_ANSWER: { color: '#6b7280', label: 'No Answer' },
  BUSY:      { color: '#eab308', label: 'Busy' },
  IN_CALL:   { color: '#3b82f6', label: 'In Call' },
  INITIATED: { color: '#6366f1', label: 'Initiated' },
  RINGING:   { color: '#f97316', label: 'Ringing' },
  PENDING:   { color: '#374151', label: 'Pending' },
};

// Pure CSS sparkline chart (no lib needed)
function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48, padding: '0 4px' }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1, borderRadius: '3px 3px 0 0', minWidth: 3,
            height: `${Math.max((v / max) * 100, 4)}%`,
            background: i === data.length - 1
              ? 'var(--accent)'
              : 'rgba(99,102,241,0.3)',
            transition: 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// Donut chart (pure SVG)
function DonutChart({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  const r = 40; const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <circle
        cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', user?.organizationId],
    queryFn: async () => {
      const p = user?.organizationId ? `?organizationId=${user.organizationId}` : '';
      const { data } = await api.get<{ data: AnalyticsData }>(`/analytics${p}`);
      return data.data;
    },
    refetchInterval: 30_000,
  });

  // Mock sparkline data (replace with real time-series when available)
  const sparkData = [12, 19, 14, 28, 22, 35, 40, 31, 27, 44, 38, 52, 48, 60, 55, 72, 65, 80, 76, 90];

  const statCards = [
    {
      label: 'Total Calls',
      value: data?.totalCalls.toLocaleString() ?? '—',
      icon: Phone,
      color: '#6366f1',
      trend: '+12.5%', up: true,
      sub: 'All time',
    },
    {
      label: 'Connected',
      value: data?.completed.toLocaleString() ?? '—',
      icon: CheckCircle2,
      color: '#22c55e',
      trend: `${data?.connectionRate ?? 0}%`, up: true,
      sub: 'Connection rate',
    },
    {
      label: 'Avg Duration',
      value: data ? fmtDuration(data.avgDurationSeconds) : '—',
      icon: Clock,
      color: '#f97316',
      trend: '+4.5%', up: true,
      sub: 'Per completed call',
    },
    {
      label: 'Minutes Used',
      value: data?.totalMinutesUsed.toFixed(0) ?? '—',
      icon: Zap,
      color: '#a855f7',
      trend: `${data?.totalCampaigns ?? 0} campaigns`, up: true,
      sub: 'Credits consumed',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Title ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Live overview of all call activity across your campaigns</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Last 7 days','Last 30 days','Last 3 months'].map((label, i) => (
            <button
              key={label}
              className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            {/* Glow blob */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 80, height: 80, borderRadius: '50%',
              background: s.color, opacity: 0.07, filter: 'blur(12px)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={16} color={s.color} />
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 12, fontWeight: 600,
                color: s.up ? 'var(--green)' : 'var(--red)',
              }}>
                <ArrowUpRight size={12} />
                {s.trend}
              </span>
            </div>
            <p className="stat-card-value">
              {isLoading ? <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>…</span> : s.value}
            </p>
            <p className="stat-card-label" style={{ marginTop: 6 }}>{s.label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart + Donut row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Volume Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Call Volume</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Total calls over time</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px 8px' }}>
            <Sparkline data={sparkData} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => (
                <span key={m} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Connection Rate Donut */}
        <div className="card">
          <div className="card-header">
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Connected %</p>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <DonutChart pct={data?.connectionRate ?? 0} color="var(--accent)" />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {data?.connectionRate ?? 0}%
                </span>
              </div>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Connected</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{data?.completed ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>No Answer</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{data?.noAnswer ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Failed</span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>{data?.failed ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Breakdown Table ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Call Status Breakdown
          </p>
          <span className="badge badge-accent">{data?.statusBreakdown.length ?? 0} statuses</span>
        </div>
        {(!data || data.statusBreakdown.length === 0) ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No call data yet. Launch a campaign to see analytics.
          </div>
        ) : (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.statusBreakdown.map((b) => {
              const meta = STATUS_META[b.status] ?? { color: '#6b7280', label: b.status };
              return (
                <div key={b.status} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 88, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>
                    {meta.label}
                  </span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.max(b.pct, 1)}%`,
                      background: meta.color,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <span style={{ width: 32, fontSize: 12, fontWeight: 600, color: meta.color, textAlign: 'right', flexShrink: 0 }}>
                    {b.pct}%
                  </span>
                  <span style={{ width: 40, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                    {b.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick stats row ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Avg Latency',  value: `${data?.avgLatencyMs ?? 0} ms`,  icon: Zap,         color: '#f97316', sub: 'Bolna LLM response' },
          { label: 'Credits Used', value: `${data?.totalCreditCost?.toFixed(2) ?? '0'} min`, icon: TrendingUp, color: '#a855f7', sub: 'This billing cycle' },
          { label: 'Campaigns',    value: data?.totalCampaigns ?? 0,         icon: Megaphone,   color: '#14b8a6', sub: 'Total launched' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: `${s.color}15`, border: `1px solid ${s.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {isLoading ? '…' : String(s.value)}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
