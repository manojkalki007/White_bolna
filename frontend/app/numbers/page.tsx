'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Spinner } from '@/components/ui';
import { Phone, MapPin, ArrowRight } from 'lucide-react';

interface PhoneNumber {
  id: string;
  phone_number: string;
  country: string;
  capabilities?: { voice?: boolean; sms?: boolean };
  status?: string;
  agent_id?: string | null;
}

function useNumbers() {
  return useQuery({
    queryKey: ['numbers'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PhoneNumber[] | any }>('/numbers');
      const raw = data.data;
      return Array.isArray(raw) ? raw : (raw as any)?.phone_numbers ?? [];
    },
  });
}

export default function NumbersPage() {
  const { data: numbers = [], isLoading, error } = useNumbers();

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Phone Numbers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Phone numbers rented or imported in your Smallest.ai workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Spinner className="h-8 w-8" /></div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load phone numbers. Make sure the backend is running.
        </div>
      ) : numbers.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow ring-1 ring-gray-200 py-24">
          <Phone className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm">No phone numbers found in your workspace.</p>
          <a
            href="https://app.smallest.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-teal-600 hover:underline text-sm font-medium"
          >
            Rent a number in Atoms →
          </a>
        </div>
      ) : (
        <div className="bg-white shadow ring-1 ring-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Phone Number', 'Country', 'Capabilities', 'Agent Assigned', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {numbers.map((n: PhoneNumber) => (
                <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">
                    {n.phone_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {n.country ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex gap-2">
                      {n.capabilities?.voice && (
                        <span className="rounded-full bg-teal-50 text-teal-700 px-2 py-0.5 text-xs font-medium">Voice</span>
                      )}
                      {n.capabilities?.sms && (
                        <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">SMS</span>
                      )}
                      {!n.capabilities?.voice && !n.capabilities?.sms && <span className="text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {n.agent_id ? (
                      <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{n.agent_id}</span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      n.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {n.status ?? 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg bg-teal-50 ring-1 ring-teal-200 p-4 text-sm text-teal-800 flex items-start gap-2">
        <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          To rent new numbers or assign them to agents, visit{' '}
          <a href="https://app.smallest.ai" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            app.smallest.ai
          </a>{' '}
          → Phone Numbers.
        </span>
      </div>
    </div>
  );
}
