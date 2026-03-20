'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface CreateOrgForm {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  smallestAiApiKey: string;
  smallestAiBaseUrl: string;
  plan: string;
  brandName: string;
  primaryColor: string;
  logoUrl: string;
}

export default function NewOrgPage() {
  const router = useRouter();
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<CreateOrgForm>({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    smallestAiApiKey: '',
    smallestAiBaseUrl: 'https://atoms-api.smallest.ai/api/v1',
    plan: 'STARTER',
    brandName: '',
    primaryColor: '#0d9488',
    logoUrl: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CreateOrgForm>) => {
      const { data: res } = await api.post('/admin/orgs', data);
      return res;
    },
    onSuccess: () => router.push('/admin'),
  });

  const set = (field: keyof CreateOrgForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<CreateOrgForm> = { ...form };
    if (!payload.smallestAiApiKey) delete payload.smallestAiApiKey;
    if (!payload.brandName) delete payload.brandName;
    if (!payload.logoUrl) delete payload.logoUrl;
    createMutation.mutate(payload);
  };

  const inputClass =
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-600 sm:text-sm';

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/admin" className="text-teal-600 hover:text-teal-700 flex items-center text-sm font-medium mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Organisation</h1>
      <p className="text-sm text-gray-500 mb-8">Set up a new client workspace with their own Smallest.ai credentials.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow ring-1 ring-gray-200 p-6 space-y-8">

        {/* ── Org Details ─────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b">Organisation Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name *</label>
              <input required value={form.name} onChange={set('name')} className={inputClass} placeholder="Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name (optional)</label>
                <input value={form.brandName} onChange={set('brandName')} className={inputClass} placeholder="Acme AI Voice" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={form.plan} onChange={set('plan')} className={inputClass}>
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primaryColor} onChange={set('primaryColor')} className="h-9 w-12 rounded cursor-pointer border border-gray-300" />
                  <input value={form.primaryColor} onChange={set('primaryColor')} className={inputClass} placeholder="#0d9488" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (optional)</label>
                <input value={form.logoUrl} onChange={set('logoUrl')} className={inputClass} placeholder="https://…/logo.png" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Admin User ──────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b">Admin User</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input required value={form.adminName} onChange={set('adminName')} className={inputClass} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input required type="email" value={form.adminEmail} onChange={set('adminEmail')} className={inputClass} placeholder="jane@acme.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
              <input required type="password" value={form.adminPassword} onChange={set('adminPassword')} className={inputClass} placeholder="Min. 8 characters" minLength={8} />
            </div>
          </div>
        </section>

        {/* ── Smallest.ai Credentials ─────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1 pb-2 border-b">Smallest.ai Workspace</h2>
          <p className="text-xs text-gray-400 mb-4">Each client should have their own Atoms workspace. If not set, the global .env key is used as fallback.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.smallestAiApiKey}
                  onChange={set('smallestAiApiKey')}
                  className={inputClass + ' pr-10 font-mono'}
                  placeholder="sk_…"
                />
                <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (optional override)</label>
              <input value={form.smallestAiBaseUrl} onChange={set('smallestAiBaseUrl')} className={`${inputClass} font-mono text-xs`} />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-4 pt-2">
          <Link href="/admin" className="text-sm font-medium text-gray-600">Cancel</Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Organisation'}
          </button>
        </div>
        {createMutation.isError && (
          <p className="text-red-500 text-sm text-right">Failed to create org. Check all fields and try again.</p>
        )}
      </form>
    </div>
  );
}
