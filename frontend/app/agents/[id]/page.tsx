'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';
import {
  Bot, Loader2, ChevronLeft, CheckCircle2, AlertCircle,
  Mic, Cpu, Globe, MessageSquare, Sliders, Trash2, Phone,
} from 'lucide-react';

interface Agent {
  id: string;
  bolnaAgentId: string;
  name: string;
  status: string;
  llmModel: string;
  llmProvider: string;
  voiceId: string;
  voiceProvider: string;
  language: string;
  welcomeMessage?: string;
  systemPrompt: string;
  bufferingDelay: number;
  interruptionThreshold: number;
  fromNumber?: string;
  createdAt: string;
}

const LLM_MODELS = [
  { value: 'gpt-4o-mini',    label: 'GPT-4o Mini  (Fast, economical)'   },
  { value: 'gpt-4o',         label: 'GPT-4o  (High quality)'            },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku  (Anthropic, fast)' },
  { value: 'llama-3-70b',    label: 'Llama 3 70B  (Open source)'        },
];
const VOICES = [
  { value: 'meera', label: 'Meera  (Indian English, Female)' },
  { value: 'rahul', label: 'Rahul  (Indian English, Male)'   },
  { value: 'emma',  label: 'Emma  (US English, Female)'      },
  { value: 'james', label: 'James  (US English, Male)'       },
  { value: 'priya', label: 'Priya  (Hindi, Female)'          },
];
const LANGUAGES = [
  { value: 'en',    label: 'English'         },
  { value: 'hi',    label: 'Hindi'           },
  { value: 'en-IN', label: 'English (India)' },
];

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Agent }>(`/agents/${agentId}`);
      return data.data;
    },
  });

  const [form, setForm] = useState<Partial<Agent>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (agent) setForm(agent);
  }, [agent]);

  const set = (k: keyof Agent, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const update = useMutation({
    mutationFn: async () => {
      const { data } = await api.put(`/agents/${agentId}`, form);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setSaved(true);
      toastSuccess('Agent updated', 'Changes saved successfully.');
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toastError('Save failed', 'Could not update agent. Try again.'),
  });

  const destroy = useMutation({
    mutationFn: async () => {
      await api.delete(`/agents/${agentId}`);
    },
    onSuccess: () => {
      toastSuccess('Agent deleted');
      router.push('/agents');
    },
    onError: () => toastError('Delete failed', 'Could not delete agent.'),
  });

  const field = (label: string, icon: React.ReactNode, node: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {label}
      </label>
      {node}
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Agent not found</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
            <ChevronLeft size={13} /> Back
          </button>
          <div>
            <h1 className="page-title">{agent.name}</h1>
            <p className="page-subtitle">
              Bolna ID: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{agent.bolnaAgentId}</code>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22c55e' }}>
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          <button
            onClick={() => destroy.mutate()}
            disabled={destroy.isPending}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Agent Configuration
            </p>
            <span className={`badge ${agent.status === 'ACTIVE' ? 'badge-green' : 'badge-yellow'}`}>
              {agent.status}
            </span>
          </div>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {field('Agent Name', <Bot size={12} color="var(--text-muted)" />,
            <input className="input" value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('LLM Model', <Cpu size={12} color="var(--text-muted)" />,
              <select className="input" value={form.llmModel ?? ''} onChange={e => set('llmModel', e.target.value)}>
                {LLM_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
            {field('Voice', <Mic size={12} color="var(--text-muted)" />,
              <select className="input" value={form.voiceId ?? ''} onChange={e => set('voiceId', e.target.value)}>
                {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('Language', <Globe size={12} color="var(--text-muted)" />,
              <select className="input" value={form.language ?? ''} onChange={e => set('language', e.target.value)}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            )}
            {field('From Number', <Phone size={12} color="var(--text-muted)" />,
              <input className="input" value={form.fromNumber ?? ''} onChange={e => set('fromNumber', e.target.value)} placeholder="+91XXXXXXXXXX" />
            )}
          </div>

          {field('Welcome Message', <MessageSquare size={12} color="var(--text-muted)" />,
            <input className="input" value={form.welcomeMessage ?? ''} onChange={e => set('welcomeMessage', e.target.value)} />
          )}

          {field('System Prompt', <MessageSquare size={12} color="var(--text-muted)" />,
            <textarea
              className="input"
              rows={5}
              value={form.systemPrompt ?? ''}
              onChange={e => set('systemPrompt', e.target.value)}
              style={{ resize: 'vertical', minHeight: 110 }}
            />
          )}

          <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={12} /> Advanced Settings
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {field('Buffering Delay (ms)', null,
                <input className="input" type="number" value={form.bufferingDelay ?? 100} onChange={e => set('bufferingDelay', Number(e.target.value))} />
              )}
              {field('Interruption Threshold (ms)', null,
                <input className="input" type="number" value={form.interruptionThreshold ?? 50} onChange={e => set('interruptionThreshold', Number(e.target.value))} />
              )}
            </div>
          </div>

          {update.isError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} />
              {(update.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update agent'}
            </div>
          )}

          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
          >
            {update.isPending
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              : <><CheckCircle2 size={14} /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
