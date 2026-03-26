'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import {
  Bot, Mic, Globe, Zap, Plus, Settings2, Loader2,
  CheckCircle2, XCircle, AlertCircle, Cpu,
} from 'lucide-react';
import Link from 'next/link';

interface Agent {
  id: string;
  bolnaAgentId: string;
  name: string;
  status: string;
  llmModel?: string;
  llmProvider?: string;
  voiceId?: string;
  voiceProvider?: string;
  language?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
  createdAt: string;
}

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; color: string; badge: string }> = {
  ACTIVE:    { icon: CheckCircle2,  color: '#22c55e', badge: 'badge badge-green'  },
  INACTIVE:  { icon: XCircle,       color: '#ef4444', badge: 'badge badge-red'    },
  DRAFT:     { icon: AlertCircle,   color: '#eab308', badge: 'badge badge-yellow' },
};

const LLM_COLORS: Record<string, string> = {
  'gpt-4o':      '#10a37f',
  'gpt-4o-mini': '#10a37f',
  'claude-3-haiku': '#cc785c',
  'llama-3-70b': '#7c3aed',
};

export default function AgentsPage() {
  const { user } = useAuth();

  const { data: agents = [], isLoading, error } = useQuery<Agent[]>({
    queryKey: ['agents', user?.organizationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Agent[] }>('/agents');
      return Array.isArray(data.data) ? data.data : [];
    },
    staleTime: 30_000,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Voice Agents</h1>
          <p className="page-subtitle">AI voice agents powered by Bolna — configure, deploy, monitor</p>
        </div>
        <Link href="/agents/new" className="btn btn-primary">
          <Plus size={14} />
          New Agent
        </Link>
      </div>

      {/* ── Summary ─────────────────────────────────────────────── */}
      {!isLoading && agents.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Total Agents',  value: agents.length,                                                   color: '#6366f1', icon: Bot          },
            { label: 'Active',        value: agents.filter(a => a.status === 'ACTIVE').length,                color: '#22c55e', icon: CheckCircle2 },
            { label: 'Models Used',   value: new Set(agents.map(a => a.llmModel ?? 'unknown')).size,          color: '#f97316', icon: Cpu          },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{
                width: 34, height: 34, borderRadius: 8, marginBottom: 10,
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={15} color={s.color} />
              </div>
              <p className="stat-card-value" style={{ fontSize: 24 }}>{s.value}</p>
              <p className="stat-card-label" style={{ marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>
            Failed to load agents. Ensure your Bolna API key is configured in <code style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4 }}>.env</code>.
          </p>
        </div>
      ) : agents.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={24} color="var(--accent)" />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            No agents yet
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Create your first Bolna voice agent to start making calls
          </p>
          <Link href="/agents/new" className="btn btn-primary">
            <Plus size={14} /> Create Agent
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {agents.map((agent) => {
            const statusMeta = STATUS_ICON[agent.status] ?? STATUS_ICON.INACTIVE;
            const modelColor = LLM_COLORS[agent.llmModel ?? ''] ?? '#6366f1';

            return (
              <div key={agent.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={18} color="white" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {agent.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                        {agent.bolnaAgentId.slice(0, 20)}…
                      </p>
                    </div>
                  </div>
                  <span className={statusMeta.badge} style={{ flexShrink: 0 }}>
                    {agent.status}
                  </span>
                </div>

                {/* Welcome message */}
                {agent.welcomeMessage && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--text-secondary)',
                    fontStyle: 'italic', lineHeight: 1.5,
                    maxHeight: 48, overflow: 'hidden',
                  }}>
                    "{agent.welcomeMessage}"
                  </div>
                )}

                {/* Metadata grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { icon: Cpu,   label: agent.llmModel ?? 'Unknown',   color: modelColor   },
                    { icon: Mic,   label: agent.voiceId ?? 'Default',    color: '#a855f7'    },
                    { icon: Globe, label: agent.language ?? 'en',        color: '#14b8a6'    },
                    { icon: Zap,   label: agent.voiceProvider ?? 'bolna', color: '#f97316'  },
                  ].map(m => (
                    <div key={m.label} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px', borderRadius: 6,
                      background: `${m.color}10`, border: `1px solid ${m.color}20`,
                    }}>
                      <m.icon size={11} color={m.color} />
                      <span style={{ fontSize: 11, color: m.color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  <Link href={`/agents/${agent.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    <Settings2 size={12} /> Configure
                  </Link>
                  <Link href={`/campaigns/launch?agentId=${agent.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    <Zap size={12} /> Launch
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
