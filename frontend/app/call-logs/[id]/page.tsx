'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ChevronLeft, Phone, Clock, Loader2, AlertCircle,
  MessageSquare, Activity, Headphones, Zap,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface CallLog {
  id: string;
  bolnaCallId?: string;
  status: string;
  duration?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  creditCost?: number;
  transcript?: string;
  recordingUrl?: string;
  disconnectReason?: string;
  postCallMetrics?: Record<string, unknown>;
  createdAt: string;
  endedAt?: string;
  contact?: { name?: string; phoneNumber: string };
  campaign?: { name: string; id: string };
  agent?: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#22c55e', FAILED: '#f87171',
  NO_ANSWER: '#f59e0b', BUSY: '#f59e0b',
  IN_CALL: 'var(--primary)', INITIATED: '#94a3b8', PENDING: '#94a3b8',
};

export default function CallLogDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const { data: log, isLoading } = useQuery<CallLog>({
    queryKey: ['call-log', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CallLog }>(`/call-logs/${id}`);
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Call log not found</p>
      </div>
    );
  }

  const statusColor = STATUS_COLOR[log.status] ?? '#94a3b8';

  return (
    <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/call-logs" className="btn btn-secondary btn-sm">
          <ChevronLeft size={13} /> Back
        </Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{log.contact?.name ?? log.contact?.phoneNumber ?? 'Unknown'}</h1>
          <p className="page-subtitle">
            {log.campaign && (
              <><Link href={`/campaigns/${log.campaign.id}`} style={{ color: 'var(--accent)' }}>{log.campaign.name}</Link> · </>
            )}
            {log.agent?.name && <>{log.agent.name} · </>}
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
          </p>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30`,
        }}>
          {log.status}
        </span>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { icon: <Phone size={14} color="var(--primary)" />, label: 'Phone', value: log.contact?.phoneNumber ?? '—' },
          { icon: <Clock size={14} color="#22c55e" />, label: 'Duration', value: log.duration ? `${log.duration}s` : '—' },
          { icon: <Zap size={14} color="#f59e0b" />, label: 'Avg Latency', value: log.avgLatencyMs ? `${log.avgLatencyMs}ms` : '—' },
          { icon: <Activity size={14} color="#a855f7" />, label: 'Credit', value: log.creditCost ? `${log.creditCost.toFixed(2)} min` : '—' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 14 }}>
            <div style={{ marginBottom: 8 }}>{s.icon}</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.value}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Times */}
      <div className="card" style={{ padding: 16, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Started</p>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {format(new Date(log.createdAt), 'MMM d, h:mm:ss a')}
          </p>
        </div>
        {log.endedAt && (
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ended</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {format(new Date(log.endedAt), 'MMM d, h:mm:ss a')}
            </p>
          </div>
        )}
        {log.bolnaCallId && (
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bolna Call ID</p>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {log.bolnaCallId}
            </p>
          </div>
        )}
        {log.disconnectReason && (
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Disconnect Reason</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#f87171', fontWeight: 600 }}>{log.disconnectReason}</p>
          </div>
        )}
      </div>

      {/* Recording */}
      {log.recordingUrl && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Headphones size={14} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recording</p>
            </div>
          </div>
          <div className="card-body">
            <audio
              controls
              src={log.recordingUrl}
              style={{ width: '100%', borderRadius: 8, outline: 'none', filter: 'invert(1) hue-rotate(180deg)' }}
            />
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Transcript</p>
          </div>
        </div>
        <div className="card-body">
          {log.transcript ? (
            <pre style={{
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7,
              color: 'var(--text-secondary)', maxHeight: 400, overflowY: 'auto',
            }}>
              {log.transcript}
            </pre>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No transcript available.</p>
          )}
        </div>
      </div>

      {/* Post-call analytics */}
      {log.postCallMetrics && Object.keys(log.postCallMetrics).length > 0 && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Post-Call Analytics</p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 10 }}>
              {Object.entries(log.postCallMetrics).map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 7,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
