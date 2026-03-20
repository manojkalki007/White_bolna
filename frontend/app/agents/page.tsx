'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Spinner } from '@/components/ui';
import { Bot, Mic, Globe } from 'lucide-react';

interface Agent {
  _id: string;
  name: string;
  workflowType?: string;
  language?: { default?: string } | string;
  synthesizer?: { voiceConfig?: { voiceId?: string } };
  status?: string;
}

function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Agent[] | { agents: Agent[] } }>('/agents');
      // Handle both array and wrapped response shapes
      const raw = data.data;
      return Array.isArray(raw) ? raw : (raw as any).agents ?? [];
    },
  });
}

export default function AgentsPage() {
  const { data: agents = [], isLoading, error } = useAgents();

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agents</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI voice agents configured in your Smallest.ai workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load agents. Make sure the backend is running and the Atoms API key is valid.
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow ring-1 ring-gray-200 py-24">
          <Bot className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">No agents found in your Atoms workspace.</p>
          <a
            href="https://app.smallest.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-teal-600 hover:underline text-sm font-medium"
          >
            Create an agent in Atoms →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: Agent) => {
            const agentLang = typeof agent.language === 'object' ? agent.language?.default : agent.language;
            const agentVoice = agent.synthesizer?.voiceConfig?.voiceId ?? 'Lightning';
            return (
            <div
              key={agent._id}
              className="bg-white rounded-lg shadow ring-1 ring-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                    <Bot className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-[140px]">{agent._id}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    agent.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {agent.status ?? 'active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {agentLang ?? 'English'}
                </div>
                <div className="flex items-center gap-1">
                  <Mic className="h-3.5 w-3.5" />
                  {agentVoice}
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-400">
                  Type: <span className="font-medium text-gray-600">{agent.workflowType ?? 'Single Prompt'}</span>
                </p>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
