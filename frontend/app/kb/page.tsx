'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Spinner } from '@/components/ui';
import { Book, FileText, Trash2, Plus, Globe, Upload } from 'lucide-react';
import { useState } from 'react';

interface KnowledgeBase {
  id: string;
  name: string;
  type?: string;
  status?: string;
  documentCount?: number;
  createdAt?: string;
}

function useKnowledgeBases() {
  return useQuery<KnowledgeBase[]>({
    queryKey: ['kb'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ data: KnowledgeBase[] | { knowledgeBases?: KnowledgeBase[] } }>('/kb');
        const raw = data.data;
        return Array.isArray(raw) ? raw : (raw as any).knowledgeBases ?? [];
      } catch {
        return [];
      }
    },
  });
}

export default function KnowledgeBasePage() {
  const { data: kbItems = [], isLoading } = useKnowledgeBases();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      await api.post('/kb', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb'] });
      setCreating(false);
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/kb/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">
            Documents and URLs your AI agents reference during calls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="create-kb-button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New KB
          </button>
        </div>
      </div>

      {/* Create KB inline form */}
      {creating && (
        <div className="bg-white rounded-xl ring-1 ring-teal-300 shadow-sm p-5 flex items-center gap-4">
          <input
            id="new-kb-name"
            type="text"
            autoFocus
            placeholder="Knowledge Base name (e.g. Product FAQ)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createMutation.mutate(newName); }}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => createMutation.mutate(newName)}
            disabled={!newName.trim() || createMutation.isPending}
            className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
          <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600 text-sm">
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : kbItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow ring-1 ring-gray-200 py-24 gap-4">
          <Book className="h-14 w-14 text-gray-200" />
          <div className="text-center">
            <p className="text-gray-600 font-medium">No Knowledge Bases yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Create one above, then upload PDFs, paste URLs, or type text.
              Agents will automatically search them during calls.
            </p>
          </div>
          <a
            href="https://app.smallest.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-teal-600 hover:underline text-sm font-medium"
          >
            <Globe className="h-4 w-4" />
            Open Atoms Dashboard →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kbItems.map((kb) => (
            <div
              key={kb.id}
              className="bg-white rounded-xl shadow ring-1 ring-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Book className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{kb.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-[140px]">{kb.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(kb.id)}
                  disabled={deleteMutation.isPending}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {kb.documentCount !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText className="h-3.5 w-3.5" />
                  {kb.documentCount} document{kb.documentCount !== 1 ? 's' : ''}
                </div>
              )}

              {kb.status && (
                <span
                  className={`inline-flex items-center self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    kb.status === 'ready'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  {kb.status}
                </span>
              )}

              <a
                href="https://app.smallest.ai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline mt-auto"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload documents in Atoms
              </a>
            </div>
          ))}
        </div>
      )}

      {/* How it works banner */}
      <div className="rounded-xl bg-blue-50 ring-1 ring-blue-200 p-4 text-sm text-blue-800 flex items-start gap-3">
        <FileText className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <strong>How it works:</strong> Create a Knowledge Base here, then open the Atoms
          Dashboard to upload PDFs, paste URLs, or type raw text. In your Agent configuration, toggle the KB on — the
          AI will automatically search for answers during every call.
        </div>
      </div>
    </div>
  );
}
