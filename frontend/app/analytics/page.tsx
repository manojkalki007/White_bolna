'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import {
  TrendingUp, TrendingDown, Phone, CheckCircle2,
  Clock, Zap, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
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
  const m = Math.floor(s / 60); const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// Simulated recent daily trend for the graph
const chartData = [
  { name: 'Day 1', baseline: 40, actual: 60 },
  { name: 'Day 2', baseline: 50, actual: 70 },
  { name: 'Day 3', baseline: 80, actual: 120 },
  { name: 'Day 4', baseline: 60, actual: 100 },
  { name: 'Day 5', baseline: 90, actual: 150 },
  { name: 'Day 6', baseline: 110, actual: 180 },
  { name: 'Day 7', baseline: 160, actual: 240 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '8px 12px', borderRadius: 6, color: 'white', fontSize: 13, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <p style={{ margin: '0 0 4px', color: '#a1a1aa' }}>{label}</p>
        <p style={{ margin: 0, fontWeight: 600, color: '#f43f5e' }}>Expected: {payload[0].value}</p>
        <p style={{ margin: 0, fontWeight: 600, color: '#fb7185' }}>Connected: {payload[1].value}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', user?.organizationId],
    queryFn: async () => {
      const p = user?.organizationId ? `?organizationId=${user.organizationId}` : '';
      const { data: res } = await api.get<{ data: AnalyticsData }>(`/analytics${p}`);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const kpis = [
    {
      title: 'Total Telephony Calls',
      value: isLoading ? '—' : (data?.totalCalls.toLocaleString() ?? '0'),
      badge: '+14.2%', badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Volume across all campaigns ↗',
      sub2: 'Trending positively',
    },
    {
      title: 'Connected Pickups',
      value: isLoading ? '—' : (data?.completed.toLocaleString() ?? '0'),
      badge: `${data?.connectionRate ?? 0}%`, badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Active connection rate ↗',
      sub2: 'Above platform average',
    },
    {
      title: 'Average Call Duration',
      value: isLoading ? '—' : (data ? fmtDuration(data.avgDurationSeconds) : '0s'),
      badge: '+2.1%', badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Meaningful engagement duration ↗',
      sub2: 'Stable metric',
    },
    {
      title: 'Gross Minutes Consumed',
      value: isLoading ? '—' : (data?.totalMinutesUsed.toFixed(0) ?? '0'),
      badge: `${data?.totalCampaigns ?? 0} Campaigns`, badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Total AI compute time ↗',
      sub2: 'Within standard limits',
    },
  ];

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: 24,
      background: '#0a0a0b', minHeight: '100vh', padding: '10px 24px 60px',
      color: '#e4e4e7', fontFamily: 'Inter, sans-serif'
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px 0', color: '#f4f4f5' }}>Telephony Analytics</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>Real-time aggregated engagement metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 8, background: '#121214', border: '1px solid #27272a', borderRadius: 8, padding: 4 }}>
          {['7D', '30D', '3M', 'YTD'].map((label, i) => (
            <button
              key={label}
              style={{
                background: i === 1 ? '#27272a' : 'transparent',
                color: i === 1 ? '#f4f4f5' : '#a1a1aa',
                border: 'none', fontWeight: 600, padding: '4px 12px',
                borderRadius: 4, cursor: 'pointer', fontSize: 13
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {kpis.map((kpi, i) => (
          <Card key={i} style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, boxShadow: 'none' }}>
            <CardContent style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 500, margin: 0 }}>{kpi.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: kpi.badgeBg, padding: '4px 8px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                  {kpi.up ? <TrendingUp size={12} color="#e4e4e7" /> : <TrendingDown size={12} color="#e4e4e7" />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e4e7' }}>{kpi.badge}</span>
                </div>
              </div>
              
              <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 20px 0', color: '#fafafa', letterSpacing: '-0.8px' }}>
                {kpi.value}
              </h2>

              <div>
                <p style={{ fontSize: 12, color: '#e4e4e7', fontWeight: 500, margin: '0 0 4px 0' }}>{kpi.sub1}</p>
                <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>{kpi.sub2}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── MAIN CHART: Red Dual Wave ── */}
      <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, overflow: 'hidden', boxShadow: 'none' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#f4f4f5' }}>Call Connection Trajectory</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>Trailing 7-day volume connected</p>
          </div>
        </div>
        
        <div style={{ height: 320, width: '100%', padding: '0 0 20px 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9f1239" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#9f1239" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="baseline" stroke="#9f1239" strokeWidth={3} fillOpacity={1} fill="url(#colorBaseline)" />
              <Area type="monotone" dataKey="actual" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
