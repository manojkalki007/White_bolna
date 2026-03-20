'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Megaphone, Phone, Plus, BarChart3,
  CheckCircle2, XCircle, Zap,
} from 'lucide-react';

interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalCampaigns: number;
  totalCalls: number;
  recentOrgs: { id: string; name: string; plan: string; createdAt: string }[];
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  brandName: string | null;
  crmType: string | null;
  createdAt: string;
  _count: { users: number; campaigns: number };
}

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  PRO: 'bg-blue-50 text-blue-700',
  ENTERPRISE: 'bg-purple-50 text-purple-700',
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Guard: only SUPER_ADMIN
  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.push('/');
  }, [user, router]);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data.data;
    },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const { data: orgs = [] } = useQuery<Org[]>({
    queryKey: ['admin-orgs'],
    queryFn: async () => {
      const { data } = await api.get('/admin/orgs');
      return data.data;
    },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/admin/orgs/${id}`, { isActive: !isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
  });

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const statCards = [
    { label: 'Total Orgs', value: stats?.totalOrgs ?? '—', icon: Building2, color: 'bg-teal-50 text-teal-600' },
    { label: 'Active Orgs', value: stats?.activeOrgs ?? '—', icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
    { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Campaigns', value: stats?.totalCampaigns ?? '—', icon: Megaphone, color: 'bg-orange-50 text-orange-600' },
    { label: 'Total Calls', value: stats?.totalCalls ?? '—', icon: Phone, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-teal-600" />
            Super Admin Panel
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all client organisations and their credentials.</p>
        </div>
        <Link
          href="/admin/orgs/new"
          className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Organisation
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-4 flex flex-col gap-2">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Org table */}
      <div className="bg-white shadow ring-1 ring-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            All Organisations ({orgs.length})
          </h2>
          <BarChart3 className="h-4 w-4 text-gray-400" />
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Organisation', 'Plan', 'Users', 'Campaigns', 'CRM', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{org.brandName ?? org.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{org.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[org.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                    {org.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{org._count.users}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{org._count.campaigns}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{org.crmType ?? '—'}</td>
                <td className="px-4 py-3">
                  {org.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                      <XCircle className="h-3.5 w-3.5" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/orgs/${org.id}`}
                      className="text-xs text-teal-600 hover:underline font-medium"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => toggleActive.mutate({ id: org.id, isActive: org.isActive })}
                      className={`text-xs font-medium ${org.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {org.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  No organisations yet.{' '}
                  <Link href="/admin/orgs/new" className="text-teal-600 hover:underline">
                    Create the first one →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
