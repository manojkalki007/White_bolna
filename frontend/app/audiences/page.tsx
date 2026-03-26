'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Users, Plus, Phone, Loader2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Audience {
  id: string;
  name: string;
  description?: string;
  _count?: { contacts: number };
  createdAt: string;
}

export default function AudiencesPage() {
  const { user } = useAuth();

  const { data: audiences = [], isLoading } = useQuery<Audience[]>({
    queryKey: ['audiences', user?.organizationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Audience[] }>('/audiences');
      return Array.isArray(data.data) ? data.data : [];
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Audiences</h1>
          <p className="page-subtitle">Manage contact lists for outbound campaigns</p>
        </div>
        <Link href="/audiences/new" className="btn btn-primary">
          <Plus size={14} /> New Audience
        </Link>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : audiences.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={24} color="var(--accent)" />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            No audiences yet
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Upload a CSV to create your first contact list
          </p>
          <Link href="/audiences/new" className="btn btn-primary">
            <Plus size={14} /> Create Audience
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={14} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Contact Lists
              </p>
              <span className="badge badge-accent">{audiences.length}</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {['List Name', 'Contacts', 'Created', 'Actions'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {audiences.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Users size={14} color="var(--accent)" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{a.name}</p>
                        {a.description && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{a.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(a._count?.contacts ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href={`/audiences/${a.id}`} className="btn btn-secondary btn-sm">View</Link>
                      <Link href={`/campaigns/launch?audienceId=${a.id}`} className="btn btn-primary btn-sm">
                        Launch
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
