/**
 * components/dashboard/RecentCampaigns.tsx
 *
 * Pure Server Component — renders the recent campaigns table.
 * Receives pre-fetched data as props. No fetching, no hooks.
 */

import Link from 'next/link';
import { Megaphone, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CampaignSummary } from '@/lib/server/data';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED:   { label: 'Completed',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  IN_PROGRESS: { label: 'Running',    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  PENDING:     { label: 'Pending',    color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' },
  FAILED:      { label: 'Failed',     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  PAUSED:      { label: 'Paused',     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
};

interface Props {
  campaigns: CampaignSummary[];
  total: number;
}

export function RecentCampaigns({ campaigns, total }: Props) {
  return (
    <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden', boxShadow: 'none' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #27272a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={14} color="#e11d48" />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f4f4f5' }}>Recent Campaigns</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 20, background: 'rgba(225,29,72,0.15)',
            color: '#f43f5e', border: '1px solid rgba(225,29,72,0.2)',
          }}>{total}</span>
        </div>
        <Link href="/campaigns" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: '#e11d48', fontWeight: 500, textDecoration: 'none',
        }}>
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {/* Table */}
      {campaigns.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#52525b', fontSize: 13 }}>
          No campaigns yet. <Link href="/campaigns/launch" style={{ color: '#e11d48' }}>Launch one →</Link>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f1f23' }}>
              {['Campaign', 'Agent', 'Progress', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: '#52525b',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const done = c.processedCount + c.failedCount;
              const pct  = c.totalContacts > 0 ? Math.round((done / c.totalContacts) * 100) : 0;
              const s    = STATUS_STYLE[c.status] ?? STATUS_STYLE.PENDING;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #18181b' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#f4f4f5' }}>{c.name}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, color: '#71717a' }}>
                      {c.agent?.name ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#27272a', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#e11d48', borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#71717a', minWidth: 28 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      color: s.color, background: s.bg,
                    }}>{s.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
