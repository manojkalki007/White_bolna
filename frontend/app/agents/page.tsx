'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import {
  Bot, Mic, Globe, Zap, Plus, Settings2, Loader2,
  CheckCircle2, XCircle, AlertCircle, Cpu, Megaphone,
  PhoneCall, RefreshCw, MoreHorizontal, Trash2, Power,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface Agent {
  id: string;
  bolnaAgentId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  llmModel?: string;
  llmProvider?: string;
  voiceId?: string;
  voiceProvider?: string;
  language?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
  temperature?: number;
  createdAt: string;
  _count?: { campaigns: number; callLogs: number };
  organization?: { name: string; brandName: string | null };
}

const STATUS_META = {
  ACTIVE:   { color: '#22c55e', badge: 'badge-green',  label: 'Active',   Icon: CheckCircle2 },
  INACTIVE: { color: '#ef4444', badge: 'badge-red',    label: 'Inactive', Icon: XCircle },
  DRAFT:    { color: '#eab308', badge: 'badge-yellow', label: 'Draft',    Icon: AlertCircle },
};

const LLM_COLORS: Record<string, string> = {
  'gpt-4o': '#10a37f',
  'gpt-4o-mini': '#10a37f',
  'claude-3-haiku': '#cc785c',
  'claude-3-sonnet': '#cc785c',
  'llama-3-70b': '#7c3aed',
};

const MODEL_LABELS: Record<string, string> = {
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'claude-3-haiku': 'Claude Haiku',
  'claude-3-sonnet': 'Claude Sonnet',
  'llama-3-70b': 'Llama 3 70B',
};

function AgentSkeletonCard() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Skeleton style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ flex: 1 }}>
          <Skeleton style={{ height: 14, width: '60%', marginBottom: 8, background: 'rgba(255,255,255,0.04)' }} />
          <Skeleton style={{ height: 11, width: '40%', background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
      <Skeleton style={{ height: 40, borderRadius: 8, marginBottom: 12, background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');

  const { data: agents = [], isLoading, error, refetch, isFetching } = useQuery<Agent[]>({
    queryKey: ['agents', user?.organizationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Agent[] }>('/agents');
      return Array.isArray(data.data) ? data.data : [];
    },
    staleTime: 30_000,
  });

  const syncAgents = useMutation({
    mutationFn: async () => {
      await api.post('/agents/sync');
    },
    onSuccess: () => refetch(),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/agents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const filtered = agents.filter(a =>
    statusFilter === 'all' || a.status === statusFilter
  );

  const activeCount = agents.filter(a => a.status === 'ACTIVE').length;
  const totalCampaigns = agents.reduce((s, a) => s + (a._count?.campaigns ?? 0), 0);
  const totalCalls = agents.reduce((s, a) => s + (a._count?.callLogs ?? 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), #be123c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(225,29,72,0.3)',
          }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>AI Voice Agents</h1>
            <p className="page-subtitle">Bolna-powered agents — configure, deploy & monitor</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => syncAgents.mutate()}
            disabled={syncAgents.isPending}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} className={syncAgents.isPending ? 'animate-spin' : ''} />
            {syncAgents.isPending ? 'Syncing...' : 'Sync Bolna'}
          </button>
          <Link href="/agents/new" className="btn btn-primary" style={{ fontSize: 13 }}>
            <Plus size={14} /> New Agent
          </Link>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {!isLoading && agents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Total Agents',  value: agents.length,  color: 'var(--primary)', icon: Bot },
            { label: 'Active',         value: activeCount,    color: '#22c55e', icon: CheckCircle2 },
            { label: 'Campaigns',      value: totalCampaigns, color: '#f97316', icon: Megaphone },
            { label: 'Calls Made',     value: totalCalls,     color: '#3b82f6', icon: PhoneCall },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${s.color}15`, border: `1px solid ${s.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <s.icon size={16} color={s.color} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {s.value}
                </p>
                <p className="stat-card-label" style={{ marginTop: 4 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Tabs ── */}
      {agents.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'ACTIVE', 'INACTIVE'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="btn btn-sm"
              style={{
                background: statusFilter === f ? 'rgba(225,29,72,0.15)' : 'var(--bg-elevated)',
                color: statusFilter === f ? '#fb7185' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === f ? 'rgba(225,29,72,0.3)' : 'var(--border)'}`,
              }}
            >
              {f === 'all' ? `All (${agents.length})` : f === 'ACTIVE' ? `Active (${activeCount})` : `Inactive (${agents.length - activeCount})`}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => <AgentSkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <XCircle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#f87171', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Failed to load agents</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Ensure your Bolna API key is configured in backend <code style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4 }}>.env</code>
          </p>
          <button onClick={() => refetch()} className="btn btn-primary">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '72px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
            background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={28} color="var(--primary)" />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {statusFilter !== 'all' ? 'No agents match this filter' : 'No agents yet'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            {statusFilter !== 'all'
              ? 'Try switching to "All" to see all agents'
              : 'Create your first Bolna voice agent to start making AI-powered calls'
            }
          </p>
          <Link href="/agents/new" className="btn btn-primary">
            <Plus size={14} /> Create First Agent
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
          {filtered.map((agent) => {
            const status = STATUS_META[agent.status] ?? STATUS_META.INACTIVE;
            const modelColor = LLM_COLORS[agent.llmModel ?? ''] ?? 'var(--primary)';
            const modelLabel = MODEL_LABELS[agent.llmModel ?? ''] ?? (agent.llmModel ?? 'Unknown');

            return (
              <div key={agent.id} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Card header */}
                <div style={{
                  padding: '16px 18px 14px',
                  background: `linear-gradient(135deg, rgba(225,29,72,0.06), transparent)`,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--primary), #be123c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 12px rgba(225,29,72,0.3)',
                    }}>
                      <Bot size={18} color="white" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {agent.name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
                        <span>{agent.bolnaAgentId.slice(0, 22)}…</span>
                        {agent.organization && (
                          <>
                            <span style={{ opacity: 0.4 }}>•</span>
                            <span style={{ color: '#fb7185', fontFamily: 'Inter, sans-serif' }}>
                              {user?.role === 'SUPER_ADMIN' ? (agent.organization.brandName || agent.organization.name) : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`badge ${status.badge}`} style={{ fontSize: 10.5 }}>
                      <status.Icon size={9} /> {status.label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                        <MoreHorizontal size={13} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10,
                      }}>
                        <DropdownMenuItem style={{ fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => window.location.href = `/agents/${agent.id}`}>
                          <Settings2 size={12} /> Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem style={{ fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => window.location.href = `/campaigns/launch?agentId=${agent.id}`}>
                          <Megaphone size={12} /> Launch Campaign
                        </DropdownMenuItem>
                        <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
                        <DropdownMenuItem
                          onClick={() => deactivate.mutate(agent.id)}
                          style={{ fontSize: 12.5, color: '#f87171', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} /> Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Welcome message */}
                {agent.welcomeMessage && (
                  <div style={{
                    margin: '12px 16px 0',
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic',
                    lineHeight: 1.5, maxHeight: 50, overflow: 'hidden',
                  }}>
                    "{agent.welcomeMessage}"
                  </div>
                )}

                {/* Meta chips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '14px 16px' }}>
                  {[
                    { icon: Cpu,   label: modelLabel,                    color: modelColor },
                    { icon: Mic,   label: agent.voiceId ?? 'Default',    color: '#a855f7' },
                    { icon: Globe, label: agent.language?.toUpperCase() ?? 'EN', color: '#14b8a6' },
                    { icon: Zap,   label: agent.voiceProvider ?? 'bolna', color: '#f97316' },
                  ].map(m => (
                    <div key={m.label} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 7,
                      background: `${m.color}10`, border: `1px solid ${m.color}20`,
                    }}>
                      <m.icon size={11} color={m.color} />
                      <span style={{ fontSize: 11, color: m.color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Usage stats */}
                {agent._count && (
                  <div style={{
                    display: 'flex', gap: 0,
                    borderTop: '1px solid var(--border)',
                  }}>
                    {[
                      { label: 'Campaigns', value: agent._count.campaigns, color: 'var(--primary)' },
                      { label: 'Calls', value: agent._count.callLogs, color: '#22c55e' },
                    ].map((s, i) => (
                      <div key={s.label} style={{
                        flex: 1, padding: '10px 14px', textAlign: 'center',
                        borderRight: i === 0 ? '1px solid var(--border)' : 'none',
                      }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
                      </div>
                    ))}
                    <div style={{ flex: 2, padding: '8px 14px', display: 'flex', gap: 8 }}>
                      <Link href={`/agents/${agent.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        <Settings2 size={11} /> Edit
                      </Link>
                      <Link href={`/campaigns/launch?agentId=${agent.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        <Zap size={11} /> Launch
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
