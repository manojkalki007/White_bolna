'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, AlignJustify,
  Columns3, MoreVertical, Plus, ChevronDown, CheckCircle2,
  Clock, Edit3, Eye
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

/* ─────────── Types ─────────── */
interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalCampaigns: number;
  totalCalls: number;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  brandName: string | null;
  creditBalance: number;
  createdAt: string;
  calls: number;
  durationMin: number;
  _count: { users: number; campaigns: number };
}

/* ─────────── MOCK CHART DATA ─────────── */
// This simulates the dual-wave layout from the screenshot showing call volume over the last week.
const chartData = [
  { name: 'Jun 24', baseline: 120, actual: 160 },
  { name: 'Jun 25', baseline: 100, actual: 130 },
  { name: 'Jun 26', baseline: 150, actual: 210 },
  { name: 'Jun 27', baseline: 190, actual: 280 },
  { name: 'Jun 28', baseline: 160, actual: 230 },
  { name: 'Jun 29', baseline: 110, actual: 150 },
  { name: 'Jun 30', baseline: 180, actual: 260 },
];

/* ─────────── Utils ─────────── */
function fmt(n: number) {
  return n.toLocaleString('en-US'); 
}

function dateMonth(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─────────── Component ─────────── */
export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Outline');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.push('/');
  }, [user, router]);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => { const { data } = await api.get('/admin/stats'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const { data: orgs = [], isLoading: orgsLoading } = useQuery<OrgRow[]>({
    queryKey: ['admin-orgs'],
    queryFn: async () => { const { data } = await api.get('/admin/orgs'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const totalCalls = orgs.reduce((s, o) => s + (o.calls ?? 0), 0);
  const totalMins = orgs.reduce((s, o) => s + (o.durationMin ?? 0), 0);
  const activeCount = orgs.filter(o => o.isActive).length;

  const kpis = [
    {
      title: 'Total Tenants',
      value: statsLoading ? '—' : fmt(stats?.totalOrgs ?? 0),
      badge: '+12.5%', badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Trending up this month ↗',
      sub2: 'Visitors for the last 6 months',
    },
    {
      title: 'Active Users',
      value: statsLoading ? '—' : fmt(stats?.totalUsers ?? 0),
      badge: '-20%', badgeBg: 'rgba(255,255,255,0.06)', up: false,
      sub1: 'Down 20% this period ↘',
      sub2: 'Acquisition needs attention',
    },
    {
      title: 'Active Accounts',
      value: fmt(activeCount),
      badge: '+12.5%', badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Strong user retention ↗',
      sub2: 'Engagement exceed targets',
    },
    {
      title: 'Total Telephony Mins',
      value: fmt(totalMins) + 'm',
      badge: '+4.5%', badgeBg: 'rgba(255,255,255,0.06)', up: true,
      sub1: 'Steady performance increase ↗',
      sub2: 'Meets growth projections',
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#18181b', border: '1px solid #27272a', padding: '8px 12px', borderRadius: 6, color: 'white', fontSize: 13, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <p style={{ margin: '0 0 4px', color: '#a1a1aa' }}>{label}</p>
          <p style={{ margin: 0, fontWeight: 600, color: '#f43f5e' }}>Baseline: {payload[0].value}</p>
          <p style={{ margin: 0, fontWeight: 600, color: '#fb7185' }}>Peak: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: 24,
      background: '#0a0a0b', minHeight: '100vh', padding: '10px 24px 60px',
      color: '#e4e4e7', fontFamily: 'Inter, sans-serif'
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#f4f4f5' }}>Overview</h1>
        <Link href="/admin/orgs/new">
          <Button style={{ background: '#ef4444', color: 'white', borderRadius: 6, padding: '0 16px', fontWeight: 600, border: 'none', height: 36, boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)' }}>
            <div style={{ background: 'white', color: '#ef4444', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, fontSize: 13, fontWeight: 800 }}>+</div>
            New Client
          </Button>
        </Link>
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

      {/* ── MAIN CHART: "Total Visitors" Style ── */}
      <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, overflow: 'hidden', boxShadow: 'none' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#f4f4f5' }}>Total Telephony Volume</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>Total for the last 3 months</p>
          </div>
          <div style={{ display: 'flex', border: '1px solid #27272a', borderRadius: 6, overflow: 'hidden', background: '#09090b', height: 32 }}>
            {['Last 3 months', 'Last 30 days', 'Last 7 days'].map((range, i) => (
              <button key={range} style={{
                background: i === 2 ? '#27272a' : 'transparent',
                color: i === 2 ? '#f4f4f5' : '#a1a1aa',
                border: 'none', padding: '0 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                borderRight: i < 2 ? '1px solid #27272a' : 'none'
              }}>
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ height: 260, width: '100%', paddingBottom: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9f1239" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#9f1239" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 11}} dy={10} minTickGap={30} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <Area type="natural" dataKey="baseline" stroke="#9f1239" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" />
              <Area type="natural" dataKey="actual" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── BOTTOM DATA SECTION ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 24, width: 'auto', paddingBottom: 4 }}>
            {[
              { label: 'All Clients', badge: null },
              { label: 'Active Campaigns', badge: stats?.totalCampaigns ? String(stats.totalCampaigns) : '0' },
              { label: 'Enterprise', badge: orgs.filter(o => o.plan === 'ENTERPRISE').length.toString() }
            ].map(t => (
              <button key={t.label} onClick={() => setActiveTab(t.label)} style={{
                background: t.label === activeTab ? '#27272a' : 'transparent', border: '1px solid',
                borderColor: t.label === activeTab ? '#3f3f46' : 'transparent', borderRadius: 20,
                padding: '4px 12px', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                color: t.label === activeTab ? '#e4e4e7' : '#a1a1aa',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {t.label}
                {t.badge && t.badge !== '0' && (
                  <span style={{ background: '#3f3f46', color: '#e4e4e7', fontSize: 11, padding: '1px 6px', borderRadius: 12 }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #27272a', color: '#e4e4e7', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
              <Columns3 size={14} /> Customize Columns <ChevronDown size={14} style={{ marginLeft: 4 }} />
            </button>
            <Link href="/admin/orgs/new">
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #27272a', color: '#e4e4e7', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Plus size={14} /> Add Client
              </button>
            </Link>
          </div>
        </div>

        {/* The Exact Table UI */}
        <div style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, overflow: 'hidden' }}>
          
          {/* Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px minmax(200px, 2fr) 1.5fr 1fr 1fr 1fr 1.5fr 40px', padding: '14px 20px', borderBottom: '1px solid #27272a', alignItems: 'center' }}>
            <div />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" style={{ width: 14, height: 14, borderRadius: 3, accentColor: '#3f3f46' }} />
              Client Name
            </div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Subscription</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Status</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Users</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Calls Made</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Join Date</div>
            <div />
          </div>

          {/* Table Rows */}
          {orgsLoading ? (
            <div style={{ padding: 24, textAlign: 'center' }}><Skeleton style={{ height: 200, opacity: 0.1 }} /></div>
          ) : orgs.map(org => (
            <div key={org.id} style={{ display: 'grid', gridTemplateColumns: '50px minmax(200px, 2fr) 1.5fr 1fr 1fr 1fr 1.5fr 40px', padding: '16px 20px', borderBottom: '1px solid #27272a', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <AlignJustify size={14} color="#52525b" style={{ cursor: 'grab' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" style={{ width: 14, height: 14, accentColor: '#3f3f46' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7' }}>{org.brandName || org.name}</span>
              </div>
              
              <div>
                <span style={{ 
                  background: 'transparent', border: '1px solid #27272a', padding: '4px 12px', borderRadius: 16, 
                  fontSize: 12, color: '#a1a1aa' 
                }}>
                  {org.plan} Plan
                </span>
              </div>

              <div>
                {org.isActive ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#121214', border: '1px solid #27272a', padding: '4px 12px', borderRadius: 16, fontSize: 12, color: '#e4e4e7' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    Done
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#121214', border: '1px solid #27272a', padding: '4px 10px', borderRadius: 16, fontSize: 12, color: '#e4e4e7' }}>
                    <Clock size={10} color="#a1a1aa" />
                    In Process
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>{org._count?.users ?? 0}</div>
              <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>{org.calls ?? 0}</div>
              <div style={{ fontSize: 13, color: '#e4e4e7' }}>{dateMonth(org.createdAt)}</div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <MoreVertical size={16} color="#71717a" style={{ cursor: 'pointer' }} />
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
