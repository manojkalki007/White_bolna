'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Save, Key, Palette, Link2, Eye, EyeOff,
  Building2, Users, Megaphone, PhoneCall, Zap, Activity, Plus, X, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  brandName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  crmType: string | null;
  crmInstanceUrl: string | null;
  smallestAiBaseUrl: string | null;
  hasSmallestAiKey: boolean;
  users: { id: string; name: string; email: string; role: string }[];
  _count: { campaigns: number; contacts: number };
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery<OrgDetail>({
    queryKey: ['admin-org', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orgs/${id}`);
      return data.data;
    },
  });

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [plan, setPlan] = useState('STARTER');
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [crmType, setCrmType] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) {
      setBaseUrl(org.smallestAiBaseUrl ?? 'https://atoms-api.smallest.ai/api/v1');
      setPlan(org.plan);
      setBrandName(org.brandName ?? '');
      setPrimaryColor(org.primaryColor ?? '#6366f1');
      setCrmType(org.crmType ?? '');
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await api.patch(`/admin/orgs/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'ADMIN' });

  const addUserMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/orgs/${id}/users`, newUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] });
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'ADMIN' });
    },
  });

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      plan,
      brandName: brandName || null,
      primaryColor,
      crmType: crmType || null,
      smallestAiBaseUrl: baseUrl || null,
    };
    if (apiKey) payload.smallestAiApiKey = apiKey;
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Skeleton style={{ height: 100, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Skeleton style={{ height: 300, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
          <Skeleton style={{ height: 300, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1000, margin: '0 auto' }}>
      
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link href="/admin/clients" passHref style={{ display: 'inline-flex' }}>
          <Button variant="ghost" size="icon" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} />
          </Button>
        </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title" style={{ fontSize: 24 }}>{org.brandName ?? org.name}</h1>
              {org.isActive ? (
                <span className="badge badge-green">Active</span>
              ) : (
                <span className="badge badge-red">Suspended</span>
              )}
            </div>
            <p className="page-subtitle" style={{ fontFamily: 'monospace' }}>Tenant ID: {org.id}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Saved Successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn btn-primary"
            style={{ padding: '10px 20px' }}
          >
            <Save size={16} />
            {updateMutation.isPending ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* ── Key Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Users', value: org.users.length, icon: Users, color: '#3b82f6' },
          { label: 'Campaigns', value: org._count.campaigns, icon: Megaphone, color: '#f97316' },
          { label: 'Contacts', value: org._count.contacts, icon: PhoneCall, color: '#22c55e' },
          { label: 'Plan', value: org.plan, icon: Building2, color: '#a855f7' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${s.color}15`, border: `1px solid ${s.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Layout Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Left Col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Bolna Auth */}
          <Card>
            <CardHeader style={{ padding: '18px 24px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Key size={16} color="#6366f1" />
                <CardTitle style={{ fontSize: 15 }}>Bolna AI Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>API Status</span>
                  <span className={`badge ${org.hasSmallestAiKey ? 'badge-green' : 'badge-orange'}`}>
                    {org.hasSmallestAiKey ? 'Custom Key Active' : 'Fallback Key Active'}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {org.hasSmallestAiKey ? 'This tenant uses its own isolated Bolna API key.' : 'This tenant defaults to the global platform Bolna API key.'}
                </p>
              </div>
              
              <div>
                <label className="label">Override API Key</label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={org.hasSmallestAiKey ? "•••••••••••••••• (Set)" : "sk_..."}
                    style={{ fontFamily: 'monospace', paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>Leave blank to keep existing key.</p>
              </div>

              <div>
                <label className="label">Base API URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </CardContent>
          </Card>

          {/* CRM Integration */}
          <Card>
            <CardHeader style={{ padding: '18px 24px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link2 size={16} color="#22c55e" />
                <CardTitle style={{ fontSize: 15 }}>CRM Sync</CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '0 24px 24px' }}>
              <div>
                <label className="label">CRM Provider</label>
                <select
                  value={crmType}
                  onChange={(e) => setCrmType(e.target.value)}
                  className="input"
                  style={{ appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">None configured</option>
                  <option value="HUBSPOT">HubSpot</option>
                  <option value="SALESFORCE">Salesforce</option>
                  <option value="ZOHO">Zoho CRM</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Branding & Sub */}
          <Card>
            <CardHeader style={{ padding: '18px 24px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Palette size={16} color="#a855f7" />
                <CardTitle style={{ fontSize: 15 }}>Brand & Plan</CardTitle>
              </div>
            </CardHeader>
            <CardContent style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Subscription Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="input"
                  style={{ appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="STARTER">Starter Tier</option>
                  <option value="PRO">Professional Tier</option>
                  <option value="ENTERPRISE">Enterprise Tier</option>
                </select>
              </div>

              <div>
                <label className="label">Display Name (White-label)</label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={org.name}
                />
              </div>

              <div>
                <label className="label">Primary Theme Color</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: 44, height: 40, padding: 4, cursor: 'pointer' }}
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User List */}
          <Card>
            <CardHeader style={{ padding: '18px 24px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={16} color="#3b82f6" />
                  <CardTitle style={{ fontSize: 15 }}>Seat Management</CardTitle>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-gray">{org.users.length} seats</span>
                  <button onClick={() => setShowAddUser(true)} className="btn btn-sm" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent style={{ padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {org.users.map((u, i) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 24px',
                    borderBottom: i === org.users.length - 1 ? 'none' : '1px solid var(--border)',
                  }}>
                    <Avatar style={{ width: 32, height: 32, borderRadius: '50%' }}>
                      <AvatarFallback style={{ background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 700 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                    <div>
                      <span className="badge badge-accent" style={{ fontSize: 9 }}>{u.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', maxWidth: 400 }}>
          <DialogHeader style={{ marginBottom: 12 }}>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Assign credentials for this tenant.</DialogDescription>
          </DialogHeader>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Full Name</label>
              <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Access Role</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="input">
                <option value="ADMIN">Tenant Admin</option>
                <option value="USER">Standard User</option>
                <option value="VIEWER">Read-Only Viewer</option>
              </select>
            </div>
            {addUserMutation.isError && (
              <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 6 }}>
                {(addUserMutation.error as any)?.response?.data?.error ?? 'Failed to add user.'}
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={!newUser.name || !newUser.email || !newUser.password || addUserMutation.isPending}
              onClick={() => addUserMutation.mutate()}
            >
              {addUserMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Credentials
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
