'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, Megaphone, CheckCircle2, XCircle, Pause,
  Loader2, Users, Phone, ChevronRight, Clock, Zap,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  processedCount: number;
  failedCount: number;
  activeHoursFrom?: string;
  activeHoursTo?: string;
  createdAt: string;
  bolnaAgentId?: string;
  agent?: { name: string };
}

const STATUS_META: Record<string, { label: string; class: string }> = {
  PENDING:     { label: 'Pending',     class: 'badge badge-gray'   },
  IN_PROGRESS: { label: 'Running',     class: 'badge badge-blue'   },
  COMPLETED:   { label: 'Completed',   class: 'badge badge-green'  },
  FAILED:      { label: 'Failed',      class: 'badge badge-red'    },
  PAUSED:      { label: 'Paused',      class: 'badge badge-yellow' },
};

export default function CampaignsPage() {
  const { user } = useAuth();
  const [page] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', user?.organizationId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(user?.organizationId ? { organizationId: user.organizationId } : {}),
      });
      const { data } = await api.get<{ data: Campaign[]; total: number }>(`/campaigns?${params}`);
      return data;
    },
    refetchInterval: 15_000,
  });

  const campaigns = data?.data ?? [];

  const summaryStats = [
    {
      label: 'Total Campaigns',
      value: data?.total ?? 0,
      icon: Megaphone,
      color: '#6366f1',
    },
    {
      label: 'Running',
      value: campaigns.filter(c => c.status === 'IN_PROGRESS').length,
      icon: Zap,
      color: '#22c55e',
    },
    {
      label: 'Completed',
      value: campaigns.filter(c => c.status === 'COMPLETED').length,
      icon: CheckCircle2,
      color: '#3b82f6',
    },
    {
      label: 'Total Contacts',
      value: campaigns.reduce((s, c) => s + c.totalContacts, 0),
      icon: Users,
      color: '#f97316',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Manage and monitor your outbound calling campaigns</p>
        </div>
        <Link href="/campaigns/launch" className="btn btn-primary">
          <Plus size={14} />
          New Campaign
        </Link>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {summaryStats.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 70, height: 70,
              borderRadius: '50%', background: s.color, opacity: 0.07, filter: 'blur(10px)',
            }} />
            <div style={{
              width: 34, height: 34, borderRadius: 8, marginBottom: 10,
              background: `${s.color}18`, border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <s.icon size={15} color={s.color} />
            </div>
            <p className="stat-card-value" style={{ fontSize: 24 }}>
              {isLoading ? '…' : s.value.toLocaleString()}
            </p>
            <p className="stat-card-label" style={{ marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Megaphone size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              All Campaigns
            </p>
            {campaigns.length > 0 && (
              <span className="badge badge-accent">{campaigns.length}</span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ padding: 20, color: '#f87171', fontSize: 13 }}>
            Failed to load campaigns. Check the backend is running.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {['Campaign', 'Agent', 'Status', 'Progress', 'Schedule', 'Created', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    No campaigns yet.{' '}
                    <Link href="/campaigns/launch" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      Launch your first one →
                    </Link>
                  </td>
                </tr>
              ) : (
                campaigns.map(c => {
                  const done = c.processedCount + c.failedCount;
                  const pct = c.totalContacts > 0 ? Math.round((done / c.totalContacts) * 100) : 0;
                  const meta = STATUS_META[c.status] ?? { label: c.status, class: 'badge badge-gray' };

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Megaphone size={14} color="var(--accent)" />
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                        {c.agent?.name ?? (c.bolnaAgentId ? c.bolnaAgentId.slice(0, 12) + '…' : '—')}
                      </td>
                      <td><span className={meta.class}>{meta.label}</span></td>
                      <td>
                        <div style={{ minWidth: 120 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{done} / {c.totalContacts}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 12 }}>
                            {c.activeHoursFrom ? `${c.activeHoursFrom} – ${c.activeHoursTo}` : '24 / 7'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </td>
                      <td>
                        <Link href={`/campaigns/${c.id}`} className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          View <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
