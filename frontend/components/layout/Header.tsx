'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

const PAGE_TITLES: Record<string, string> = {
  '/analytics':  'Analytics',
  '/agents':     'Voice Agents',
  '/campaigns':  'Campaigns',
  '/numbers':    'Phone Numbers',
  '/audiences':  'Audiences',
  '/kb':         'Knowledge Base',
  '/call-logs':  'Call Logs',
  '/admin':      'Super Admin',
  '/settings':   'Settings',
};

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Dashboard';

  return (
    <header className="page-header">
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search placeholder */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', cursor: 'text',
        }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Search...</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
        </div>

        {/* Notifications */}
        <button
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <Bell size={14} />
        </button>

        {/* Role Badge */}
        {user?.role === 'SUPER_ADMIN' && (
          <span className="badge badge-purple">SUPER ADMIN</span>
        )}
      </div>
    </header>
  );
}
