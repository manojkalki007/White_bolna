'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Bot, Megaphone, Phone, BarChart2,
  FileText, Users, ShieldCheck, Zap, LogOut, Settings,
  BookOpen, Headphones,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

const navGroups = [
  {
    title: 'Platform',
    items: [
      { name: 'Dashboard',    href: '/analytics',  icon: LayoutDashboard },
      { name: 'Agents',       href: '/agents',     icon: Bot },
      { name: 'Campaigns',    href: '/campaigns',  icon: Megaphone },
    ],
  },
  {
    title: 'Manage',
    items: [
      { name: 'Phone Numbers', href: '/numbers',   icon: Phone },
      { name: 'Audiences',     href: '/audiences', icon: Users },
      { name: 'Knowledge Base',href: '/kb',        icon: BookOpen },
    ],
  },
  {
    title: 'Observe',
    items: [
      { name: 'Call Logs',    href: '/call-logs',  icon: Headphones },
      { name: 'Analytics',    href: '/analytics',  icon: BarChart2 },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'Settings',     href: '/settings',   icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CF';

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} />
        </div>
        <span className="sidebar-logo-text">Cogniflow</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="sidebar-group-label">{group.title}</div>
            {group.items.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`sidebar-item ${isActive(item.href) ? 'active' : ''}`}
              >
                <item.icon size={15} />
                {item.name}
              </Link>
            ))}
          </div>
        ))}

        {/* Super Admin */}
        {user?.role === 'SUPER_ADMIN' && (
          <div>
            <div className="sidebar-group-label">Admin</div>
            <Link
              href="/admin"
              className={`sidebar-item ${isActive('/admin') ? 'active' : ''}`}
            >
              <ShieldCheck size={15} />
              Super Admin
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name ?? '—'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email ?? ''}
            </p>
          </div>
          <button
            id="sidebar-logout"
            onClick={handleLogout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, transition: 'color 0.15s', flexShrink: 0 }}
            onMouseOver={e => (e.currentTarget.style.color = '#f87171')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
