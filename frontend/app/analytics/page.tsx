'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import {
  Phone, CheckCircle2, Clock, TrendingUp,
  Megaphone, XCircle, PhoneMissed, Zap, ArrowUpRight,
  Activity, BarChart2, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

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

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64, padding: '0 4px', width: '100%' }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1, borderRadius: '3px 3px 0 0', minWidth: 4,
            height: `${Math.max((v / max) * 100, 4)}%`,
            background: i === data.length - 1
              ? '#6366f1'
              : 'rgba(99,102,241,0.25)',
            transition: 'height 0.4s ease',
          }}
        />
      ))}
    </div>
  );
}

function DonutChart({ pct, color = '#6366f1' }: { pct: number; color?: string }) {
  const r = 40; const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <svg width={110} height={110} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={12} />
      <circle
        cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={12}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease-out' }}
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

  const sparkData = [12, 19, 14, 28, 22, 35, 40, 31, 27, 44, 38, 52, 48, 60, 55, 72, 65, 80, 76, 90];

  const statCards = [
    {
      label: 'Total Calls', value: data?.totalCalls.toLocaleString() ?? '0',
      icon: Phone, color: '#6366f1', trend: '+12.5%', up: true, sub: 'All time',
    },
    {
      label: 'Connected', value: data?.completed.toLocaleString() ?? '0',
      icon: CheckCircle2, color: '#22c55e', trend: `${data?.connectionRate ?? 0}%`, up: true, sub: 'Connection rate',
    },
    {
      label: 'Avg Duration', value: data ? fmtDuration(data.avgDurationSeconds) : '0s',
      icon: Clock, color: '#f97316', trend: '+4.5%', up: true, sub: 'Per connected call',
    },
    {
      label: 'Minutes Used', value: data?.totalMinutesUsed.toFixed(0) ?? '0',
      icon: Zap, color: '#a855f7', trend: `${data?.totalCampaigns ?? 0} campaigns`, up: true, sub: 'Credits consumed',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          }}>
            <BarChart2 size={20} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>Client Analytics Overview</h1>
            <p className="page-subtitle">Live health and usage across all your campaigns</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {['7D', '30D', '3M'].map((label, i) => (
            <button
              key={label}
              className="btn btn-sm"
              style={{
                background: i === 0 ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: i === 0 ? '#818cf8' : 'var(--text-secondary)',
                border: 'none', fontWeight: 600, padding: '4px 12px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              position: 'absolute', top: -24, right: -24,
              width: 80, height: 80, borderRadius: '50%',
              background: s.color, opacity: 0.1, filter: 'blur(16px)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={18} color={s.color} />
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 700,
                color: s.up ? 'var(--green)' : 'var(--red)',
                background: s.up ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                padding: '4px 8px', borderRadius: 999,
              }}>
                <ArrowUpRight size={12} strokeWidth={3} />
                {s.trend}
              </span>
            </div>
            {isLoading ? (
              <Skeleton style={{ height: 32, width: '60%', background: 'rgba(255,255,255,0.05)' }} />
            ) : (
              <p className="stat-card-value" style={{ fontSize: 32 }}>{s.value}</p>
            )}
            <div>
              <p className="stat-card-label" style={{ marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Volume Chart */}
        <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <CardHeader style={{ padding: '18px 24px 8px', borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <CardTitle style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Call Volume & Trend</CardTitle>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Daily calls dispatched</p>
              </div>
              <CalendarDays size={16} color="var(--text-muted)" />
            </div>
          </CardHeader>
          <CardContent style={{ padding: '24px 24px 16px' }}>
            <Sparkline data={sparkData} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '0 4px' }}>
              {['01', '05', '10', '15', '20', '25', '30'].map(d => (
                <span key={d} style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{d}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Connection Donut */}
        <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <CardHeader style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Connection Rate</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {isLoading ? (
              <Skeleton style={{ width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            ) : (
              <div style={{ position: 'relative' }}>
                <DonutChart pct={data?.connectionRate ?? 0} color="#3b82f6" />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {data?.connectionRate ?? 0}%
                  </span>
                </div>
              </div>
            )}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Connected', value: data?.completed ?? 0, color: '#22c55e' },
                { label: 'No Answer', value: data?.noAnswer ?? 0, color: '#6b7280' },
                { label: 'Failed', value: data?.failed ?? 0, color: '#ef4444' },
              ].map(st => (
                <div key={st.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{st.label}</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{isLoading ? '…' : st.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Status Breakdown & Technical Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        
        {/* Breakdown Table */}
        <Card style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <CardHeader style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Status Distribution</CardTitle>
            <Activity size={14} color="var(--text-muted)" />
          </CardHeader>
          <CardContent style={{ padding: '20px 24px' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 20, background: 'rgba(255,255,255,0.05)' }} />)}
              </div>
            ) : (!data || data.statusBreakdown.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>No call data available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data.statusBreakdown.map((b) => {
                  const meta = STATUS_META[b.status] ?? { color: '#6b7280', label: b.status };
                  return (
                    <div key={b.status} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ width: 90, fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {meta.label}
                      </span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, background: meta.color,
                          width: `${Math.max(b.pct, 2)}%`, transition: 'width 0.6s ease'
                        }} />
                      </div>
                      <span style={{ width: 44, fontSize: 12.5, fontWeight: 700, color: meta.color, textAlign: 'right' }}>
                        {b.pct}%
                      </span>
                      <span style={{ width: 40, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                        {b.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Stats Grid */}
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Avg Latency', value: `${data?.avgLatencyMs ?? 0} ms`, icon: Zap, color: '#fb923c', desc: 'Bolna Voice LLM latency' },
            { label: 'Total Campaigns', value: data?.totalCampaigns ?? 0, icon: Megaphone, color: '#a855f7', desc: 'Campaigns dispatched' },
            { label: 'Credits Consumed', value: `${data?.totalCreditCost?.toFixed(2) ?? '0.00'} min`, icon: TrendingUp, color: '#3b82f6', desc: 'Billing cycle usage' },
          ].map((s) => (
            <Card key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                background: `${s.color}15`, border: `1px solid ${s.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {isLoading ? '…' : String(s.value)}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— {s.desc}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
}
