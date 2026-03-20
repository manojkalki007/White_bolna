'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, Save, Key, Palette, Link2 } from 'lucide-react';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  brandName: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  crmType: string | null;
  crmInstanceUrl: string | null;
  smallestAiBaseUrl: string | null;
  hasSmallestAiKey: boolean;
  users: { id: string; name: string; email: string; role: string }[];
  _count: { campaigns: number; contacts: number };
}

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery<OrgDetail>({
    queryKey: ['admin-org', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orgs/${id}`);
      return data.data;
    },
  });

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [plan, setPlan] = useState('STARTER');
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0d9488');
  const [crmType, setCrmType] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (org) {
      setBaseUrl(org.smallestAiBaseUrl ?? 'https://atoms-api.smallest.ai/api/v1');
      setPlan(org.plan);
      setBrandName(org.brandName ?? '');
      setPrimaryColor(org.primaryColor ?? '#0d9488');
      setCrmType(org.crmType ?? '');
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await api.patch(`/admin/orgs/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      plan,
      brandName: brandName || null,
      primaryColor,
      crmType: crmType || null,
      smallestAiBaseUrl: baseUrl || null,
    };
    if (apiKey) payload.smallestAiApiKey = apiKey;
    updateMutation.mutate(payload);
  };

  const inputClass =
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-600 sm:text-sm';

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full" /></div>;
  }
  if (!org) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-teal-600 hover:text-teal-700 flex items-center text-sm font-medium mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{org.brandName ?? org.name}</h1>
          <p className="text-sm text-gray-400 font-mono">{org.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Plan', value: org.plan },
          { label: 'Status', value: org.isActive ? 'Active' : 'Inactive' },
          { label: 'Campaigns', value: org._count.campaigns },
          { label: 'Contacts', value: org._count.contacts },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl ring-1 ring-gray-200 p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Smallest.ai Credentials */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <Key className="h-4 w-4 text-teal-600" /> Smallest.ai Credentials
        </h2>
        <p className="text-xs text-gray-400">
          API key is currently <span className={org.hasSmallestAiKey ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
            {org.hasSmallestAiKey ? '✓ configured' : '⚠ not set (using global fallback)'}
          </span>
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New API Key (leave blank to keep existing)</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`${inputClass} pr-10 font-mono`}
              placeholder="sk_… (leave blank to keep current)"
            />
            <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={`${inputClass} font-mono text-xs`} />
        </div>
      </div>

      {/* Plan & Branding */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <Palette className="h-4 w-4 text-teal-600" /> Plan & Branding
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass}>
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className={inputClass} placeholder={org.name} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Colour</label>
          <div className="flex items-center gap-2">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded cursor-pointer border border-gray-300" />
            <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={`${inputClass} w-36`} />
          </div>
        </div>
      </div>

      {/* CRM */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <Link2 className="h-4 w-4 text-teal-600" /> CRM Integration
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CRM Type</label>
          <select value={crmType} onChange={(e) => setCrmType(e.target.value)} className={inputClass}>
            <option value="">None</option>
            <option value="HUBSPOT">HubSpot</option>
            <option value="SALESFORCE">Salesforce</option>
          </select>
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Users ({org.users.length})</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Email', 'Role'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {org.users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs rounded-full px-2 py-0.5 bg-teal-50 text-teal-700 font-medium">{u.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
