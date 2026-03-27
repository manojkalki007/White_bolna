'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';
import {
  Megaphone, Loader2, ChevronLeft, Phone, Clock, CheckCircle2,
  XCircle, Pause, Play, Users, TrendingUp, AlertCircle, Headphones,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  processedCount: number;
  failedCount: number;
  activeHoursFrom?: string;
  activeHoursTo?: string;
  createdAt: string;
  agent?: { name: string; llmModel: string; voiceId: string };
}

interface CallLog {
  id: string;
  status: string;
  duration?: number;
  avgLatencyMs?: number;
  creditCost?: number;
  createdAt: string;
  contact?: { name?: string; phoneNumber: string };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:     'badge badge-gray',
  IN_PROGRESS: 'badge badge-blue',
  COMPLETED:   'badge badge-green',
  PAUSED:      'badge badge-yellow',
  FAILED:      'badge badge-red',
};

const CALL_STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'badge badge-green',
  FAILED:    'badge badge-red',
  NO_ANSWER: 'badge badge-yellow',
  BUSY:      'badge badge-yellow',
  IN_CALL:   'badge badge-blue',
  RINGING:   'badge badge-blue',
  INITIATED: 'badge badge-gray',
  PENDING:   'badge badge-gray',
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Campaign }>(`/campaigns/${campaignId}`);
      return data.data;
    },
  });

  const { data: calls = [], isLoading: callsLoading } = useQuery<CallLog[]>({
    queryKey: ['campaign-calls', campaignId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CallLog[] }>(`/call-logs?campaignId=${campaignId}&limit=50`);
      return Array.isArray(data.data) ? data.data : [];
    },
    refetchInterval: campaign?.status === 'IN_PROGRESS' ? 5000 : false,
  });

  const pause = useMutation({
    mutationFn: () => api.post(`/campaigns/${campaignId}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toastSuccess('Campaign paused');
    },
    onError: () => toastError('Pause failed'),
  });

  const resume = useMutation({
    mutationFn: () => api.post(`/campaigns/${campaignId}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toastSuccess('Campaign resumed');
    },
    onError: () => toastError('Resume failed'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Campaign not found</p>
      </div>
    );
  }

  const progress = campaign.totalContacts > 0
    ? Math.round(((campaign.processedCount + campaign.failedCount) / campaign.totalContacts) * 100)
    : 0;

  const successRate = (campaign.processedCount + campaign.failedCount) > 0
    ? Math.round((campaign.processedCount / (campaign.processedCount + campaign.failedCount)) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
            <ChevronLeft size={13} /> Back
          </button>
          <div>
            <h1 className="page-title">{campaign.name}</h1>
            <p className="page-subtitle">
              Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
              {campaign.agent && ` · Agent: ${campaign.agent.name}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={STATUS_BADGE[campaign.status] ?? 'badge badge-gray'}>{campaign.status}</span>
          {campaign.status === 'IN_PROGRESS' && (
            <button onClick={() => pause.mutate()} disabled={pause.isPending} className="btn btn-secondary btn-sm">
              <Pause size={13} /> Pause
            </button>
          )}
          {campaign.status === 'PAUSED' && (
            <button onClick={() => resume.mutate()} disabled={resume.isPending} className="btn btn-primary btn-sm">
              <Play size={13} /> Resume
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { icon: <Users size={16} color="var(--primary)" />, label: 'Total Contacts', value: campaign.totalContacts.toLocaleString(), bg: 'rgba(225,29,72,0.1)', border: 'rgba(225,29,72,0.2)' },
          { icon: <CheckCircle2 size={16} color="#22c55e" />, label: 'Completed', value: campaign.processedCount.toLocaleString(), bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
          { icon: <XCircle size={16} color="#f87171" />, label: 'Failed', value: campaign.failedCount.toLocaleString(), bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
          { icon: <TrendingUp size={16} color="#f59e0b" />, label: 'Success Rate', value: `${successRate}%`, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {s.icon}
            </div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{s.value}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Overall Progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{progress}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--primary), #be123c)', borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {campaign.activeHoursFrom && campaign.activeHoursTo
              ? `Active hours: ${campaign.activeHoursFrom} – ${campaign.activeHoursTo}`
              : 'No active hour restriction'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {campaign.processedCount + campaign.failedCount} / {campaign.totalContacts} processed
          </span>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Headphones size={14} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Call Records</p>
            <span className="badge badge-accent">{calls.length}</span>
          </div>
        </div>
        {callsLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader2 size={20} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : calls.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              No calls yet.{campaign.status === 'IN_PROGRESS' ? ' Calls will appear here as they happen.' : ''}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {['Contact', 'Phone', 'Status', 'Duration', 'Latency', 'Credit', 'Time'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                    {call.contact?.name ?? '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{call.contact?.phoneNumber ?? '—'}</td>
                  <td>
                    <span className={CALL_STATUS_BADGE[call.status] ?? 'badge badge-gray'}>{call.status}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {call.duration ? `${call.duration}s` : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {call.avgLatencyMs ? (
                      <span style={{ color: call.avgLatencyMs < 500 ? '#22c55e' : call.avgLatencyMs < 1000 ? '#f59e0b' : '#f87171' }}>
                        {call.avgLatencyMs}ms
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {call.creditCost ? `${call.creditCost.toFixed(2)} min` : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
