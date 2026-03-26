'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2, Users, Megaphone, Phone, Plus, CheckCircle2, XCircle,
  ShieldCheck, TrendingUp, Clock, PhoneCall, CreditCard, Activity,
  Zap, ArrowUpRight, MoreVertical, Search,
} from 'lucide-react';

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
  crmType: string | null;
  creditBalance: number;
  creditUsed: number;
  creditLimit: number;
  createdAt: string;
  calls: number;
  durationMin: number;
  _count: { users: number; campaigns: number };
}

const PLAN_BADGE: Record<string, string> = {
  STARTER:    'badge badge-gray',
  PRO:        'badge badge-blue',
  ENTERPRISE: 'badge badge-purple',
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.push('/');
  }, [user, router]);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => { const { data } = await api.get('/admin/stats'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
    refetchInterval: 30_000,
  });

  const { data: orgs = [], isLoading } = useQuery<OrgRow[]>({
    queryKey: ['admin-orgs'],
    queryFn: async () => { const { data } = await api.get('/admin/orgs'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
    refetchInterval: 30_000,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/orgs/${id}`, { isActive: !isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
  });

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const filtered = orgs.filter(o =>
    !search ||
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalCallsMade = orgs.reduce((s, o) => s + o.calls, 0);
  const totalMinutes   = orgs.reduce((s, o) => s + o.durationMin, 0);

  const topStats = [
    { label: 'Client Accounts', value: fmt(stats?.totalOrgs ?? 0),     sub: `${stats?.activeOrgs ?? 0} active`,  icon: Building2, color: '#6366f1' },
    { label: 'Total Users',     value: fmt(stats?.totalUsers ?? 0),     sub: 'across all orgs',                   icon: Users,     color: '#22c55e' },
    { label: 'Calls Made',      value: fmt(totalCallsMade),             sub: 'platform-wide',                     icon: PhoneCall, color: '#3b82f6' },
    { label: 'Minutes Used',    value: fmtMins(totalMinutes),           sub: '≈ credits consumed',                icon: Clock,     color: '#f97316' },
    { label: 'Campaigns',       value: fmt(stats?.totalCampaigns ?? 0), sub: 'total launched',                    icon: Megaphone, color: '#a855f7' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px var(--accent-glow)',
          }}>
            <ShieldCheck size={18} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: 20 }}>Super Admin</h1>
            <p className="page-subtitle">Platform overview · all client accounts</p>
          </div>
        </div>
        <a href="/admin/orgs/new" className="btn btn-primary">
          <Plus size={14} />
          New Client
        </a>
      </div>

      {/* ── Platform Stat Cards ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {topStats.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 70, height: 70, borderRadius: '50%',
              background: s.color, opacity: 0.08, filter: 'blur(10px)',
            }} />
            <div style={{
              width: 34, height: 34, borderRadius: 8, marginBottom: 12,
              background: `${s.color}18`, border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={15} color={s.color} />
            </div>
            <p className="stat-card-value" style={{ fontSize: 24 }}>{s.value}</p>
            <p className="stat-card-label" style={{ marginTop: 4 }}>{s.label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Accounts Table ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Account Usage Overview
            </p>
            <span className="badge badge-accent">{orgs.length} accounts</span>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px',
          }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter accounts..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 12, color: 'var(--text-primary)', width: 160,
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['Account','Plan','Users','Campaigns','Calls','Minutes','Credits','Status','Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {search ? 'No accounts match your search.' : 'No client accounts yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((org) => {
                  const creditPct = org.creditLimit > 0
                    ? Math.min(100, Math.round((org.creditUsed / org.creditLimit) * 100))
                    : 0;
                  return (
                    <tr key={org.id}>
                      {/* Account */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: 'white',
                          }}>
                            {(org.brandName ?? org.name).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {org.brandName ?? org.name}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {org.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td><span className={PLAN_BADGE[org.plan] ?? 'badge badge-gray'}>{org.plan}</span></td>

                      {/* Users */}
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Users size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org._count.users}</span>
                        </span>
                      </td>

                      {/* Campaigns */}
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Megaphone size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org._count.campaigns}</span>
                        </span>
                      </td>

                      {/* Calls */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#818cf8' }}>{fmt(org.calls)}</span>
                      </td>

                      {/* Minutes */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#fb923c' }}>{fmtMins(org.durationMin)}</span>
                      </td>

                      {/* Credits */}
                      <td>
                        <div style={{ minWidth: 80 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{org.creditBalance}</span>
                            <span style={{ color: 'var(--text-muted)' }}>/ {org.creditLimit}</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${100 - creditPct}%`,
                                background: creditPct > 80 ? 'var(--red)' : creditPct > 50 ? 'var(--yellow)' : 'linear-gradient(90deg, var(--accent), #8b5cf6)',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {org.isActive ? (
                          <span className="badge badge-green"><CheckCircle2 size={10} /> Active</span>
                        ) : (
                          <span className="badge badge-red"><XCircle size={10} /> Inactive</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <a href={`/admin/orgs/${org.id}`} className="btn btn-secondary btn-sm">
                            Manage
                          </a>
                          <button
                            onClick={() => toggleActive.mutate({ id: org.id, isActive: org.isActive })}
                            className={`btn btn-sm ${org.isActive ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ color: org.isActive ? '#f87171' : 'var(--green)' }}
                          >
                            {org.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {orgs.length > 1 && (
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Platform Total
                  </td>
                  <td colSpan={2} />
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{orgs.reduce((s, o) => s + o._count.campaigns, 0)}</td>
                  <td style={{ fontWeight: 700, color: '#818cf8' }}>{fmt(totalCallsMade)}</td>
                  <td style={{ fontWeight: 700, color: '#fb923c' }}>{fmtMins(totalMinutes)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
