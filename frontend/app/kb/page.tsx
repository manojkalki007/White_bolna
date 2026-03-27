'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { BookOpen, Plus, FileText, Search, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface KBDoc {
  id: string;
  fileName: string;
  fileType?: string;
  status: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  PROCESSING: 'badge badge-yellow',
  READY:      'badge badge-green',
  FAILED:     'badge badge-red',
};

export default function KBPage() {
  const { user } = useAuth();

  const { data: docs = [], isLoading } = useQuery<KBDoc[]>({
    queryKey: ['kb', user?.organizationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: KBDoc[] }>('/kb');
      return Array.isArray(data.data) ? data.data : [];
    },
    refetchInterval: 15_000,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Knowledge Base</h1>
          <p className="page-subtitle">Upload documents to ground your AI agents with accurate information</p>
        </div>
        <Link href="/kb/upload" className="btn btn-primary">
          <Plus size={14} /> Upload Document
        </Link>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={24} color="var(--accent)" />
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            No documents yet
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Upload PDFs, DOCs, or TXT files to boost your agents' knowledge
          </p>
          <Link href="/kb/upload" className="btn btn-primary">
            <Plus size={14} /> Upload Document
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={14} color="var(--accent)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Documents
              </p>
              <span className="badge badge-accent">{docs.length}</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                {['Document', 'Type', 'Status', 'Uploaded', 'Actions'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FileText size={14} color="var(--accent)" />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {doc.fileName}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {doc.fileType ?? '—'}
                  </td>
                  <td>
                    <span className={STATUS_BADGE[doc.status] ?? 'badge badge-gray'}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={11} /> Delete
                    </button>
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
