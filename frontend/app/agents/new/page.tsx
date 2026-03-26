'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Bot, Loader2, ChevronLeft, CheckCircle2, AlertCircle,
  Mic, Cpu, Globe, MessageSquare, Sliders,
} from 'lucide-react';

const LLM_MODELS = [
  { value: 'gpt-4o-mini',    label: 'GPT-4o Mini  (Fast, economical)'    },
  { value: 'gpt-4o',         label: 'GPT-4o  (High quality)'             },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku  (Anthropic, fast)'  },
  { value: 'llama-3-70b',    label: 'Llama 3 70B  (Open source)'         },
];

const VOICES = [
  { value: 'meera',   label: 'Meera  (Indian English, Female)' },
  { value: 'rahul',   label: 'Rahul  (Indian English, Male)'   },
  { value: 'emma',    label: 'Emma  (US English, Female)'      },
  { value: 'james',   label: 'James  (US English, Male)'       },
  { value: 'priya',   label: 'Priya  (Hindi, Female)'          },
];

const LANGUAGES = [
  { value: 'en', label: 'English'      },
  { value: 'hi', label: 'Hindi'        },
  { value: 'en-IN', label: 'English (IN)' },
];

interface NewAgent {
  name: string;
  llmModel: string;
  llmProvider: string;
  voiceId: string;
  voiceProvider: string;
  language: string;
  welcomeMessage: string;
  systemPrompt: string;
  bufferingDelay: number;
  interruptionThreshold: number;
}

export default function NewAgentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<NewAgent>({
    name: '',
    llmModel: 'gpt-4o-mini',
    llmProvider: 'openai',
    voiceId: 'meera',
    voiceProvider: 'bolna',
    language: 'en',
    welcomeMessage: 'Hello! How can I help you today?',
    systemPrompt: 'You are a helpful voice AI assistant. Be concise and conversational.',
    bufferingDelay: 100,
    interruptionThreshold: 50,
  });

  const set = (k: keyof NewAgent, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/agents', {
        ...form,
        llmProvider: form.llmModel.startsWith('gpt') ? 'openai' :
                     form.llmModel.startsWith('claude') ? 'anthropic' : 'together',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setSuccess(true);
      setTimeout(() => router.push('/agents'), 1800);
    },
  });

  const field = (label: string, icon: React.ReactNode, node: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon} {label}
      </label>
      {node}
    </div>
  );

  if (success) {
    return (
      <div style={{ maxWidth: 600, padding: '60px 0', textAlign: 'center' }}>
        <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Agent Created!</p>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Redirecting…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
          <ChevronLeft size={13} /> Back
        </button>
        <div>
          <h1 className="page-title">New Voice Agent</h1>
          <p className="page-subtitle">Configure an AI voice agent powered by Bolna</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Agent Configuration
            </p>
          </div>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          {field('Agent Name *', <Bot size={12} color="var(--text-muted)" />,
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sales Assistant" />
          )}

          {/* LLM + Voice row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('LLM Model', <Cpu size={12} color="var(--text-muted)" />,
              <select className="input" value={form.llmModel} onChange={e => set('llmModel', e.target.value)}>
                {LLM_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
            {field('Voice', <Mic size={12} color="var(--text-muted)" />,
              <select className="input" value={form.voiceId} onChange={e => set('voiceId', e.target.value)}>
                {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            )}
          </div>

          {/* Language */}
          {field('Language', <Globe size={12} color="var(--text-muted)" />,
            <select className="input" value={form.language} onChange={e => set('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          )}

          {/* Welcome message */}
          {field('Welcome Message', <MessageSquare size={12} color="var(--text-muted)" />,
            <input className="input" value={form.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} placeholder="Hello! How can I help you today?" />
          )}

          {/* System Prompt */}
          {field('System Prompt', <MessageSquare size={12} color="var(--text-muted)" />,
            <textarea
              className="input"
              rows={4}
              value={form.systemPrompt}
              onChange={e => set('systemPrompt', e.target.value)}
              placeholder="You are a helpful voice AI assistant…"
              style={{ resize: 'vertical', minHeight: 96 }}
            />
          )}

          {/* Advanced */}
          <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={12} /> Advanced Settings
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {field('Buffering Delay (ms)', null,
                <input className="input" type="number" value={form.bufferingDelay} onChange={e => set('bufferingDelay', Number(e.target.value))} />
              )}
              {field('Interruption Threshold (ms)', null,
                <input className="input" type="number" value={form.interruptionThreshold} onChange={e => set('interruptionThreshold', Number(e.target.value))} />
              )}
            </div>
          </div>

          {/* Error */}
          {create.isError && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} />
              {(create.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to create agent'}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => create.mutate()}
            disabled={!form.name || create.isPending}
            className="btn btn-primary"
            style={{
              width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14,
              opacity: (!form.name || create.isPending) ? 0.5 : 1,
            }}
          >
            {create.isPending ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating Agent…</>
            ) : (
              <><Bot size={14} /> Create Agent</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
