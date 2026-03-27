'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Settings, Key, Palette, CreditCard, Bell, Shield,
  CheckCircle2, Loader2, Copy, Eye, EyeOff, Building2,
} from 'lucide-react';

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  plan: string;
  creditBalance: number;
  creditUsed: number;
  creditLimit: number;
  bolnaApiKey?: string;
  primaryColor?: string;
  brandName?: string;
  logoUrl?: string;
}

const SECTIONS = [
  { id: 'org',     icon: Building2,  label: 'Organisation'   },
  { id: 'api',     icon: Key,        label: 'API Keys'        },
  { id: 'credits', icon: CreditCard, label: 'Credits'         },
  { id: 'branding',icon: Palette,    label: 'Branding'        },
  { id: 'security',icon: Shield,     label: 'Security'        },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [section, setSection] = useState('org');
  const [saved, setSaved] = useState(false);
  const [showBolnaKey, setShowBolnaKey] = useState(false);
  const [copied, setCopied] = useState('');

  const { data: org, refetch } = useQuery<OrgSettings>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const { data } = await api.get<{ data: OrgSettings }>('/settings/org');
      return data.data;
    },
    enabled: !!user?.organizationId,
  });

  const [form, setForm] = useState<Partial<OrgSettings>>({});
  const set = (k: keyof OrgSettings, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      await api.patch('/settings/org', form);
    },
    onSuccess: () => {
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="label">{label}</label>
      {node}
      {hint && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );

  const effective = { ...org, ...form };

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* Sidebar nav */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div className="card" style={{ padding: 8 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(225,29,72,0.12)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your organisation and platform configuration</p>
          </div>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22c55e' }}>
              <CheckCircle2 size={14} /> Changes saved
            </span>
          )}
        </div>

        {/* Organisation */}
        {section === 'org' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={14} color="var(--accent)" />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Organisation Details</p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {field('Organisation Name',
                <input className="input" defaultValue={org?.name} onChange={e => set('name', e.target.value)} />
              )}
              {field('Slug', <input className="input" value={org?.slug ?? ''} disabled style={{ opacity: 0.5 }} />, 'Slug cannot be changed')}
              {field('Plan',
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-accent">{org?.plan ?? '…'}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Contact support to upgrade</span>
                </div>
              )}
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {save.isPending ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* API Keys */}
        {section === 'api' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={14} color="var(--accent)" />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>API Configuration</p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {field('Bolna API Key',
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showBolnaKey ? 'text' : 'password'}
                    defaultValue={org?.bolnaApiKey ?? ''}
                    onChange={e => set('bolnaApiKey', e.target.value)}
                    placeholder="bn-xxxxxxxxxxxxxxxx"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowBolnaKey(!showBolnaKey)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showBolnaKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>,
                'Per-org Bolna API key — overrides the platform default'
              )}
              {field('Organisation ID',
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" value={user?.organizationId ?? ''} readOnly style={{ fontFamily: 'monospace', fontSize: 12, flex: 1 }} />
                  <button
                    onClick={() => copyToClipboard(user?.organizationId ?? '', 'org_id')}
                    className="btn btn-secondary btn-sm"
                  >
                    {copied === 'org_id' ? <CheckCircle2 size={13} color="#22c55e" /> : <Copy size={13} />}
                  </button>
                </div>
              )}
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {save.isPending ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save API Keys'}
              </button>
            </div>
          </div>
        )}

        {/* Credits */}
        {section === 'credits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Credit Balance</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  { label: 'Available', value: `${(org?.creditBalance ?? 0).toFixed(1)} min`, color: '#22c55e' },
                  { label: 'Used', value: `${(org?.creditUsed ?? 0).toFixed(1)} min`, color: '#f59e0b' },
                  { label: 'Limit', value: `${(org?.creditLimit ?? 0).toFixed(0)} min`, color: 'var(--primary)' },
                ].map(c => (
                  <div key={c.label} style={{ padding: 14, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: c.color, fontFamily: 'monospace' }}>{c.value}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Usage</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {org ? Math.round((org.creditUsed / (org.creditLimit || 1)) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${org ? Math.round((org.creditUsed / (org.creditLimit || 1)) * 100) : 0}%`,
                    background: 'linear-gradient(90deg, var(--primary), #be123c)',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <CreditCard size={32} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>Need more credits?</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>Contact your platform admin or upgrade your plan.</p>
              <button className="btn btn-primary">Upgrade Plan</button>
            </div>
          </div>
        )}

        {/* Branding */}
        {section === 'branding' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Palette size={14} color="var(--accent)" />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>White-Label Branding</p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {field('Brand Name',
                <input className="input" defaultValue={org?.brandName ?? ''} onChange={e => set('brandName', e.target.value)} placeholder="e.g. AcmeCalls" />,
                'Replaces "Cogniflow" in the UI for your clients'
              )}
              {field('Primary Color',
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" defaultValue={org?.primaryColor ?? 'var(--primary)'} onChange={e => set('primaryColor', e.target.value)}
                    style={{ width: 40, height: 36, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }} />
                  <input className="input" defaultValue={org?.primaryColor ?? 'var(--primary)'} onChange={e => set('primaryColor', e.target.value)} style={{ flex: 1, fontFamily: 'monospace' }} />
                </div>
              )}
              {field('Logo URL',
                <input className="input" defaultValue={org?.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} placeholder="https://cdn.example.com/logo.png" />
              )}
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                {save.isPending ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Branding'}
              </button>
            </div>
          </div>
        )}

        {/* Security */}
        {section === 'security' && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={14} color="var(--accent)" />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Security</p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Authentication</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Managed by Supabase Auth — JWT tokens with auto-refresh</p>
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Webhook Security</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>HMAC-SHA256 signature verification on all Bolna webhooks</p>
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={16} color="#22c55e" />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Multi-tenant Isolation</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>All data filtered by organizationId at the DB layer</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Change Password</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  Password changes are managed via Supabase Auth. Check your email for a reset link.
                </p>
                <button className="btn btn-secondary" style={{ marginTop: 12 }}>Send Reset Email</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
