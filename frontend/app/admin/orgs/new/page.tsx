'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Building2, UserCircle, Key, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateOrgForm {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  smallestAiApiKey: string;
  smallestAiBaseUrl: string;
  plan: string;
  brandName: string;
  primaryColor: string;
  logoUrl: string;
}

const inputStyle = {
  background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7',
  padding: '8px 12px', borderRadius: 8, fontSize: 13, width: '100%', outline: 'none',
  transition: 'border 0.2s', fontFamily: 'Inter, sans-serif'
};

const labelStyle = {
  fontSize: 12, fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: 6
};

export default function NewOrgPage() {
  const router = useRouter();
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<CreateOrgForm>({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    smallestAiApiKey: '',
    smallestAiBaseUrl: 'https://api.bolna.dev/v1',
    plan: 'STARTER',
    brandName: '',
    primaryColor: '#e11d48', // Default to the red theme
    logoUrl: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CreateOrgForm>) => {
      const { data: res } = await api.post('/admin/orgs', data);
      return res;
    },
    onSuccess: () => router.push('/admin'),
  });

  const set = (field: keyof CreateOrgForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<CreateOrgForm> = { ...form };
    if (!payload.smallestAiApiKey) delete payload.smallestAiApiKey;
    if (!payload.brandName) delete payload.brandName;
    if (!payload.logoUrl) delete payload.logoUrl;
    createMutation.mutate(payload);
  };

  return (
    <div className="animate-fade-in" style={{
      background: '#0a0a0b', minHeight: '100vh', padding: '10px 24px 60px',
      color: '#e4e4e7', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <Link href="/admin" passHref>
            <button style={{ 
              background: '#121214', border: '1px solid #27272a', color: '#a1a1aa',
              padding: '8px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px 0', color: '#f4f4f5' }}>Format New Client Workspace</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>Provision an isolated tenant environment, configure billing limits, and attach Bolna telemetry.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* ── Org Details ── */}
          <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, boxShadow: 'none' }}>
            <CardHeader style={{ padding: '16px 24px', borderBottom: '1px solid #27272a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={16} color="#ef4444" />
                <CardTitle style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>Identity & Billing</CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Client Organization Name *</label>
                <input required value={form.name} onChange={set('name')} placeholder="Acme Corp" style={inputStyle} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Platform Whitelabel Brand (optional)</label>
                  <input value={form.brandName} onChange={set('brandName')} placeholder="Acme AI Telephony" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Subscription Allocation</label>
                  <select value={form.plan} onChange={set('plan')} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}>
                    <option value="STARTER">Starter Tier (1000 mins)</option>
                    <option value="PRO">Professional Tier (5000 mins)</option>
                    <option value="ENTERPRISE">Enterprise Tier (Unlimited)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Primary Accent HEX</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="color" value={form.primaryColor} onChange={set('primaryColor')} style={{ width: 44, height: 38, padding: 2, background: 'none', border: '1px solid #27272a', borderRadius: 6, cursor: 'pointer' }} />
                    <input value={form.primaryColor} onChange={set('primaryColor')} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Logo URI (optional)</label>
                  <input value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://..." style={inputStyle} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Admin User ── */}
          <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, boxShadow: 'none' }}>
            <CardHeader style={{ padding: '16px 24px', borderBottom: '1px solid #27272a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserCircle size={16} color="#ef4444" />
                <CardTitle style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>Root Client Administrator</CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input required value={form.adminName} onChange={set('adminName')} placeholder="Eddie Lake" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input required type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="eddie@acme.inc" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Temporary Provisioning Password *</label>
                <input required type="password" value={form.adminPassword} onChange={set('adminPassword')} placeholder="Min. 8 characters" minLength={8} style={inputStyle} />
              </div>
            </CardContent>
          </Card>

          {/* ── Bolna Integration ── */}
          <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, boxShadow: 'none' }}>
            <CardHeader style={{ padding: '16px 24px', borderBottom: '1px solid #27272a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Key size={16} color="#ef4444" />
                <CardTitle style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>Bolna Sub-Account Keys</CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>
                If this client has dedicated rate limits configured in Bolna, provide their isolated API Key here. Otherwise, the global fallback routing key will handle payload execution.
              </p>
              <div>
                <label style={labelStyle}>Isolated API Token</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={form.smallestAiApiKey}
                    onChange={set('smallestAiApiKey')}
                    placeholder="bp_..."
                    style={{ ...inputStyle, fontFamily: 'monospace', paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Submit actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Link href="/admin" passHref>
              <button type="button" style={{ background: 'transparent', border: '1px solid #27272a', color: '#e4e4e7', padding: '0 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, height: 36, cursor: 'pointer' }}>
                Cancel
              </button>
            </Link>
            <button type="submit" disabled={createMutation.isPending} style={{ 
              background: '#ef4444', color: 'white', borderRadius: 6, padding: '0 20px', fontWeight: 600, 
              border: 'none', height: 36, boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              {createMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Provisioning Data…</>
              ) : createMutation.isSuccess ? (
                <><CheckCircle2 size={14} /> Executed</>
              ) : (
                'Finalize Creation'
              )}
            </button>
          </div>

          {createMutation.isError && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
              {(createMutation.error as any)?.response?.data?.error ?? 'Failed to provision tenant structure. Ensure the email is not already mapped.'}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
