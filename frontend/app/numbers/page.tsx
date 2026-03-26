'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Phone, Plus, CheckCircle2, Loader2, Globe } from 'lucide-react';

interface PhoneNumber {
  id?: string;
  phoneNumber: string;
  friendlyName?: string;
  numberType?: string;
  country?: string;
  isActive?: boolean;
  capabilities?: { voice?: boolean; sms?: boolean };
}

export default function NumbersPage() {
  const { user } = useAuth();

  const { data: numbers = [], isLoading, error } = useQuery<PhoneNumber[]>({
    queryKey: ['numbers', user?.organizationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: PhoneNumber[] }>('/numbers');
      return Array.isArray(data.data) ? data.data : [];
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Phone Numbers</h1>
          <p className="page-subtitle">Manage Bolna-registered phone numbers for your campaigns</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={14} /> Buy Number
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>
            Failed to load phone numbers. Configure your Bolna API key in <code>.env</code>.
          </p>
        </div>
      ) : numbers.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Phone size={24} color="var(--accent)" />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            No phone numbers yet
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Purchase or import phone numbers to use in campaigns
          </p>
          <button className="btn btn-primary">
            <Plus size={14} /> Buy Number
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={14} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Phone Numbers
              </p>
              <span className="badge badge-accent">{numbers.length}</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {['Number', 'Friendly Name', 'Type', 'Country', 'Capabilities', 'Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map((n, i) => (
                <tr key={n.id ?? i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Phone size={14} color="#22c55e" />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13 }}>
                        {n.phoneNumber}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{n.friendlyName ?? '—'}</td>
                  <td>
                    <span className="badge badge-accent" style={{ fontSize: 10 }}>
                      {n.numberType ?? 'local'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Globe size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 12 }}>{n.country ?? 'IN'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {n.capabilities?.voice && <span className="badge badge-green" style={{ fontSize: 10 }}>Voice</span>}
                      {n.capabilities?.sms && <span className="badge badge-blue" style={{ fontSize: 10 }}>SMS</span>}
                    </div>
                  </td>
                  <td>
                    {n.isActive !== false ? (
                      <span className="badge badge-green"><CheckCircle2 size={10} /> Active</span>
                    ) : (
                      <span className="badge badge-red">Inactive</span>
                    )}
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
