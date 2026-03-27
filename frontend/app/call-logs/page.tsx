'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { formatDistanceToNow } from 'date-fns';
import {
  Headphones, ChevronDown, ChevronUp, Loader2,
  Phone, CheckCircle2, XCircle, Clock, Mic2,
  PhoneMissed, Radio,
} from 'lucide-react';

interface CallLog {
  id: string;
  status: string;
  direction: string;
  duration: number | null;
  bolnaCallId?: string;
  bolnaRecordingUrl?: string;
  transcript?: string;
  disconnectReason?: string;
  avgLatencyMs?: number;
  creditCost?: number;
  createdAt: string;
  contact?: { name?: string; phoneNumber: string };
  campaign?: { name: string };
  agent?: { name: string; voiceId?: string };
}

const STATUS_META: Record<string, { icon: typeof CheckCircle2; color: string; badge: string }> = {
  COMPLETED: { icon: CheckCircle2, color: '#22c55e', badge: 'badge badge-green'  },
  FAILED:    { icon: XCircle,      color: '#ef4444', badge: 'badge badge-red'    },
  IN_CALL:   { icon: Radio,        color: '#3b82f6', badge: 'badge badge-blue'   },
  NO_ANSWER: { icon: PhoneMissed,  color: '#6b7280', badge: 'badge badge-gray'   },
  BUSY:      { icon: Phone,        color: '#eab308', badge: 'badge badge-yellow' },
  INITIATED: { icon: Phone,        color: 'var(--primary)', badge: 'badge badge-accent' },
  RINGING:   { icon: Phone,        color: '#f97316', badge: 'badge badge-yellow' },
  PENDING:   { icon: Clock,        color: '#6b7280', badge: 'badge badge-gray'   },
};

function fmtDur(s: number | null) {
  if (s == null) return '—';
  const m = Math.floor(s / 60); const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function CallLogsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['call-logs', user?.organizationId, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(user?.organizationId ? { organizationId: user.organizationId } : {}),
      });
      const { data } = await api.get<{ data: CallLog[]; total: number }>(`/call-logs?${params}`);
      return data;
    },
    refetchInterval: 20_000,
  });

  const logs = data?.data ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Call Logs</h1>
        <p className="page-subtitle">Browse all call records, transcripts, and Bolna latency metrics</p>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Headphones size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Call Records
            </p>
            {data?.total != null && (
              <span className="badge badge-accent">{data.total.toLocaleString()} total</span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ padding: 20, color: '#f87171', fontSize: 13 }}>
            Failed to load call logs.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {['Contact', 'Campaign', 'Agent', 'Status', 'Duration', 'Latency', 'Time', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    No calls yet. Launch a campaign to see call logs.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const meta = STATUS_META[log.status] ?? STATUS_META.INITIATED;
                  const isExpanded = expandedId === log.id;

                  return (
                    <>
                      <tr
                        key={log.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                              {log.contact?.name ?? 'Unknown'}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {log.contact?.phoneNumber}
                            </p>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {log.campaign?.name ?? <span style={{ color: 'var(--text-muted)' }}>Direct</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {log.agent?.name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td><span className={meta.badge}>{log.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>
                              {fmtDur(log.duration)}
                            </span>
                          </div>
                        </td>
                        <td>
                          {log.avgLatencyMs != null ? (
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: log.avgLatencyMs > 500 ? '#f87171' : log.avgLatencyMs > 300 ? '#fbbf24' : '#4ade80',
                            }}>
                              {log.avgLatencyMs}ms
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr key={`${log.id}-expand`}>
                          <td colSpan={8} style={{ background: 'var(--bg-elevated)', padding: '16px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                              {/* Transcript */}
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                  Transcript
                                </p>
                                {log.transcript ? (
                                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto' }}>
                                    {log.transcript}
                                  </p>
                                ) : (
                                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    No transcript available
                                  </p>
                                )}
                              </div>

                              {/* Metadata */}
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                  Call Details
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {[
                                    { label: 'Bolna Call ID', value: log.bolnaCallId ?? '—' },
                                    { label: 'Disconnect Reason', value: log.disconnectReason ?? '—' },
                                    { label: 'Credit Cost', value: log.creditCost != null ? `${log.creditCost} min` : '—' },
                                    { label: 'Avg Latency', value: log.avgLatencyMs != null ? `${log.avgLatencyMs}ms` : '—' },
                                    { label: 'Direction', value: log.direction ?? 'outbound' },
                                  ].map(row => (
                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                      <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{row.value}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Recording */}
                                {log.bolnaRecordingUrl && (
                                  <div style={{ marginTop: 12 }}>
                                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                      Recording
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Mic2 size={13} color="var(--accent)" />
                                      <audio controls style={{ height: 28, flex: 1 }}>
                                        <source src={log.bolnaRecordingUrl} />
                                      </audio>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.total > 20 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-secondary btn-sm"
                style={{ opacity: page === 1 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <button
                disabled={page * 20 >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary btn-sm"
                style={{ opacity: page * 20 >= data.total ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
