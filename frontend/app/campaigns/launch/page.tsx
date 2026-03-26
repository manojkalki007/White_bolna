'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Megaphone, Bot, Upload, Clock, Loader2,
  CheckCircle2, AlertCircle, ChevronLeft, FileText,
} from 'lucide-react';

interface Agent { id: string; name: string; bolnaAgentId: string; }

export default function LaunchCampaignPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fromNumber, setFromNumber] = useState('');
  const [hoursFrom, setHoursFrom] = useState('09:00');
  const [hoursTo, setHoursTo] = useState('18:00');
  const [concurrency, setConcurrency] = useState('5');
  const [success, setSuccess] = useState(false);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents-list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Agent[] }>('/agents');
      return Array.isArray(data.data) ? data.data : [];
    },
  });

  const launch = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('name', name);
      form.append('agentId', agentId);
      form.append('fromNumber', fromNumber);
      form.append('activeHoursFrom', hoursFrom);
      form.append('activeHoursTo', hoursTo);
      form.append('concurrentCalls', concurrency);
      if (file) form.append('csv', file);
      const { data } = await api.post('/campaigns/launch', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push('/campaigns'), 2000);
    },
  });

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="label">{label}</label>
      {node}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
          <ChevronLeft size={13} /> Back
        </button>
        <div>
          <h1 className="page-title">Launch Campaign</h1>
          <p className="page-subtitle">Configure and start an outbound calling campaign</p>
        </div>
      </div>

      {success ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <CheckCircle2 size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Campaign Launched!
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Redirecting to campaigns...
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={14} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Campaign Configuration
              </p>
            </div>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Name */}
            {field('Campaign Name *',
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Q2 Onboarding Outreach"
              />
            )}

            {/* Agent */}
            {field('Voice Agent *',
              <select
                className="input"
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
              >
                <option value="">Select an agent…</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            {/* From Number */}
            {field('From Phone Number',
              <input
                className="input"
                value={fromNumber}
                onChange={e => setFromNumber(e.target.value)}
                placeholder="+91XXXXXXXXXX"
              />
            )}

            {/* CSV Upload */}
            {field('Contacts CSV *',
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '1px dashed var(--border-active)',
                    borderRadius: 8, padding: '20px',
                    textAlign: 'center', cursor: 'pointer',
                    background: 'var(--bg-elevated)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <FileText size={18} color="var(--accent)" />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={22} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                        Click to upload <span style={{ color: 'var(--accent)', fontWeight: 600 }}>CSV file</span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        Required columns: <code style={{ fontFamily: 'monospace' }}>name, phone_number</code>
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {/* Active Hours */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {field('Start Time',
                <input className="input" type="time" value={hoursFrom} onChange={e => setHoursFrom(e.target.value)} />
              )}
              {field('End Time',
                <input className="input" type="time" value={hoursTo} onChange={e => setHoursTo(e.target.value)} />
              )}
              {field('Concurrent Calls',
                <input className="input" type="number" min={1} max={20} value={concurrency} onChange={e => setConcurrency(e.target.value)} />
              )}
            </div>

            {/* Error */}
            {launch.isError && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={14} />
                {(launch.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to launch campaign'}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={() => launch.mutate()}
              disabled={!name || !agentId || !file || launch.isPending}
              className="btn btn-primary"
              style={{
                width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14,
                opacity: (!name || !agentId || !file || launch.isPending) ? 0.5 : 1,
              }}
            >
              {launch.isPending ? (
                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Launching…</>
              ) : (
                <><Megaphone size={14} /> Launch Campaign</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
