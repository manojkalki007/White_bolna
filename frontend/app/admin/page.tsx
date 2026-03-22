'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  Building2, Users, Megaphone, Phone, Plus,
  CheckCircle2, XCircle, ShieldCheck, TrendingUp,
  Clock, PhoneCall, CreditCard, Activity,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalCampaigns: number;
  totalCalls: number;
  recentOrgs: { id: string; name: string; plan: string; createdAt: string }[];
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  brandName: string | null;
  crmType: string | null;
  createdAt: string;
  calls: number;          // total calls made by this org
  durationMin: number;    // total call minutes (proxy for credits used)
  _count: { users: number; campaigns: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PLAN_BADGE: Record<string, string> = {
  STARTER:    'bg-gray-100 text-gray-700 ring-gray-200',
  PRO:        'bg-blue-50 text-blue-700 ring-blue-100',
  ENTERPRISE: 'bg-purple-50 text-purple-700 ring-purple-100',
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.push('/');
  }, [user, router]);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => { const { data } = await api.get('/admin/stats'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
    refetchInterval: 30_000,
  });

  const { data: orgs = [], isLoading } = useQuery<OrgRow[]>({
    queryKey: ['admin-orgs'],
    queryFn: async () => { const { data } = await api.get('/admin/orgs'); return data.data; },
    enabled: user?.role === 'SUPER_ADMIN',
    refetchInterval: 30_000,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/orgs/${id}`, { isActive: !isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orgs'] }),
  });

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  // Platform totals from orgs list (live)
  const totalCallsMade  = orgs.reduce((s, o) => s + o.calls, 0);
  const totalMinutes    = orgs.reduce((s, o) => s + o.durationMin, 0);

  const topStats = [
    { label: 'Client Accounts',  value: fmt(stats?.totalOrgs ?? 0),        sub: `${stats?.activeOrgs ?? 0} active`,   icon: Building2,  bg: 'from-teal-500 to-teal-600' },
    { label: 'Total Users',      value: fmt(stats?.totalUsers ?? 0),        sub: 'across all orgs',                     icon: Users,      bg: 'from-blue-500 to-blue-600' },
    { label: 'Calls Made',       value: fmt(totalCallsMade),                sub: 'platform-wide',                       icon: PhoneCall,  bg: 'from-indigo-500 to-indigo-600' },
    { label: 'Minutes Used',     value: fmtMins(totalMinutes),              sub: '≈ credits consumed',                  icon: Clock,      bg: 'from-orange-500 to-orange-600' },
    { label: 'Campaigns',        value: fmt(stats?.totalCampaigns ?? 0),    sub: 'total launched',                      icon: Megaphone,  bg: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-500">Platform overview · all client accounts</p>
          </div>
        </div>
        <Link
          href="/admin/orgs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Client
        </Link>
      </div>

      {/* ── Platform stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {topStats.map((s) => (
          <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm p-5">
            <div className={`absolute -top-4 -right-4 h-20 w-20 rounded-full bg-gradient-to-br ${s.bg} opacity-10`} />
            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center mb-3 shadow-sm`}>
              <s.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Per-account table ───────────────────────────────────────────────── */}
      <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-2xl overflow-hidden">

        {/* Table header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-semibold text-gray-900">Account Usage Overview</h2>
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              {orgs.length} accounts
            </span>
          </div>
          <TrendingUp className="h-4 w-4 text-gray-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/30">
                {[
                  'Account Name', 'Plan', 'Users',
                  'Campaigns', 'Calls Made', 'Minutes Used',
                  'CRM', 'Status', 'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    No client accounts yet.{' '}
                    <Link href="/admin/orgs/new" className="text-teal-600 hover:underline font-medium">
                      Create the first one →
                    </Link>
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50/60 transition-colors group">

                    {/* Account Name */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0"
                          style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}
                        >
                          {(org.brandName ?? org.name).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                            {org.brandName ?? org.name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-[120px]">{org.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${PLAN_BADGE[org.plan] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                        {org.plan}
                      </span>
                    </td>

                    {/* Users */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {org._count.users}
                      </div>
                    </td>

                    {/* Campaigns */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Megaphone className="h-3.5 w-3.5 text-gray-400" />
                        {org._count.campaigns}
                      </div>
                    </td>

                    {/* Calls Made */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                        <span className="text-sm font-semibold text-teal-700">{fmt(org.calls)}</span>
                      </div>
                    </td>

                    {/* Minutes / Credits */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <span className="text-sm font-semibold text-orange-600">{fmtMins(org.durationMin)}</span>
                      </div>
                    </td>

                    {/* CRM */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">
                      {org.crmType ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {org.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 rounded-full px-2 py-0.5">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/orgs/${org.id}`}
                          className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => toggleActive.mutate({ id: org.id, isActive: org.isActive })}
                          className={`text-xs font-medium transition-colors ${
                            org.isActive
                              ? 'text-red-400 hover:text-red-600'
                              : 'text-green-500 hover:text-green-700'
                          }`}
                        >
                          {org.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Footer totals row */}
            {orgs.length > 1 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Platform Total</td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 text-xs font-bold text-gray-700">{orgs.reduce((s, o) => s + o._count.campaigns, 0)} campaigns</td>
                  <td className="px-4 py-3 text-xs font-bold text-teal-700">{fmt(totalCallsMade)} calls</td>
                  <td className="px-4 py-3 text-xs font-bold text-orange-600">{fmtMins(totalMinutes)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
