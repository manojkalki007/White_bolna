'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Building2, Plus, Search, CheckCircle2, XCircle,
  Users, Megaphone, PhoneCall, MoreVertical, Eye, Ban,
  Power, Pencil, AlignJustify, SearchIcon, Columns3, ChevronDown, Check, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  brandName: string | null;
  creditBalance: number;
  creditUsed: number;
  creditLimit: number;
  createdAt: string;
  calls: number;
  durationMin: number;
  _count: { users: number; campaigns: number };
}

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function dateMonth(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All Clients');

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.push('/');
  }, [user, router]);

  const { data: orgs = [], isLoading } = useQuery<OrgRow[]>({
    queryKey: ['admin-orgs'],
    queryFn: async () => { const { data } = await api.get('/admin/orgs'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/orgs/${id}`, { isActive: !isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
  });

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const filtered = orgs
    .filter(o => {
       if (activeTab === 'All Clients') return true;
       if (activeTab === 'Active') return o.isActive;
       if (activeTab === 'Suspended') return !o.isActive;
       if (activeTab === 'Enterprise') return o.plan === 'ENTERPRISE';
       return true;
    })
    .filter(o =>
      !search ||
      (o.brandName ?? o.name).toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
    );

  const activeCount = orgs.filter(o => o.isActive).length;
  const suspendedCount = orgs.filter(o => !o.isActive).length;
  const entCount = orgs.filter(o => o.plan === 'ENTERPRISE').length;

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: 24,
      background: '#0a0a0b', minHeight: '100vh', padding: '10px 24px 60px',
      color: '#e4e4e7', fontFamily: 'Inter, sans-serif'
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px 0', color: '#f4f4f5' }}>Client Directory</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>Manage and monitor all active tenant environments</p>
        </div>
        <Link href="/admin/orgs/new">
          <Button style={{ background: '#ef4444', color: 'white', borderRadius: 6, padding: '0 16px', fontWeight: 600, border: 'none', height: 36, boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)' }}>
            <div style={{ background: 'white', color: '#ef4444', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, fontSize: 13, fontWeight: 800 }}>+</div>
            Quick Create
          </Button>
        </Link>
      </div>

      {/* ── BOTTOM DATA SECTION ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 24, width: 'auto', paddingBottom: 4 }}>
            {[
              { label: 'All Clients', badge: String(orgs.length) },
              { label: 'Active', badge: activeCount ? String(activeCount) : '0' },
              { label: 'Suspended', badge: suspendedCount ? String(suspendedCount) : '0' },
              { label: 'Enterprise', badge: entCount ? String(entCount) : '0' }
            ].map(t => (
              <button key={t.label} onClick={() => setActiveTab(t.label)} style={{
                background: t.label === activeTab ? '#27272a' : 'transparent', border: '1px solid',
                borderColor: t.label === activeTab ? '#3f3f46' : 'transparent', borderRadius: 20,
                padding: '4px 12px', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                color: t.label === activeTab ? '#e4e4e7' : '#a1a1aa',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {t.label}
                {t.badge && t.badge !== '0' && (
                  <span style={{ background: '#3f3f46', color: '#e4e4e7', fontSize: 11, padding: '1px 6px', borderRadius: 12 }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table Actions / Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#121214', border: '1px solid #27272a', padding: '4px 12px', borderRadius: 6, width: 220 }}>
              <SearchIcon size={14} color="#71717a" />
              <input 
                placeholder="Search..." 
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e4e4e7', fontSize: 13, width: '100%' }} 
              />
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid #27272a', color: '#e4e4e7', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
              <Columns3 size={14} /> Columns <ChevronDown size={14} style={{ marginLeft: 4 }} />
            </button>
          </div>
        </div>

        {/* The Exact Table UI mapped for Client List */}
        <div style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 10, overflow: 'hidden' }}>
          
          {/* Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '50px minmax(200px, 2fr) 1.5fr 1fr 1fr 1fr 1.5fr 40px', padding: '14px 20px', borderBottom: '1px solid #27272a', alignItems: 'center' }}>
            <div />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" style={{ width: 14, height: 14, borderRadius: 3, accentColor: '#3f3f46' }} />
              Client Name
            </div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Subscription</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Status</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Users Limit</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>API Calls</div>
            <div style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 600 }}>Registered</div>
            <div />
          </div>

          {/* Table Rows */}
          {isLoading ? (
            <div style={{ padding: 24, textAlign: 'center' }}><Skeleton style={{ height: 200, opacity: 0.1 }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#71717a', fontSize: 14 }}>No clients align with this filter.</div>
          ) : filtered.map(org => (
            <div key={org.id} className="hover-bg-subtle" style={{ display: 'grid', gridTemplateColumns: '50px minmax(200px, 2fr) 1.5fr 1fr 1fr 1fr 1.5fr 40px', padding: '16px 20px', borderBottom: '1px solid #27272a', alignItems: 'center', transition: 'background 0.2s' }}>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <AlignJustify size={14} color="#52525b" style={{ cursor: 'grab' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" style={{ width: 14, height: 14, accentColor: '#3f3f46' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7' }}>{org.brandName || org.name}</span>
              </div>
              
              <div>
                <span style={{ 
                  background: 'transparent', border: '1px solid #27272a', padding: '4px 12px', borderRadius: 16, 
                  fontSize: 12, color: '#a1a1aa' 
                }}>
                  {org.plan} Plan
                </span>
              </div>

              <div>
                {org.isActive ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#121214', border: '1px solid #27272a', padding: '4px 12px', borderRadius: 16, fontSize: 12, color: '#e4e4e7' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    Active
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#121214', border: '1px solid #27272a', padding: '4px 10px', borderRadius: 16, fontSize: 12, color: '#e4e4e7' }}>
                    <Clock size={10} color="#a1a1aa" />
                    Suspended
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500, fontFamily: 'monospace' }}>
                {org._count?.users ?? 0}/∞
              </div>
              <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500 }}>{fmt(org.calls ?? 0)}</div>
              <div style={{ fontSize: 13, color: '#e4e4e7' }}>{dateMonth(org.createdAt)}</div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <DropdownMenu>
                  <DropdownMenuTrigger style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <MoreVertical size={16} color="#71717a" style={{ cursor: 'pointer' }} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7' }}>
                    <DropdownMenuItem style={{ cursor: 'pointer', fontSize: 13 }} onClick={() => router.push(`/admin/orgs/${org.id}`)}>
                      <Eye size={14} style={{ marginRight: 8 }} /> View Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator style={{ background: '#27272a' }} />
                    <DropdownMenuItem
                      onClick={() => toggleActive.mutate({ id: org.id, isActive: org.isActive })}
                      style={{ cursor: 'pointer', fontSize: 13, color: org.isActive ? '#ef4444' : '#22c55e' }}
                    >
                      {org.isActive ? <><Ban size={14} style={{ marginRight: 8 }} /> Suspend</> : <><Power size={14} style={{ marginRight: 8 }} /> Activate</>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
