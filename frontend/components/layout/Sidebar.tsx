'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Bot, Megaphone, Phone, BarChart2,
  BookOpen, Headphones, Settings, LogOut, Zap,
  ShieldCheck, Building2, Users, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/* ── Nav structure ── */
const userNav = [
  {
    title: 'Platform',
    items: [
      { name: 'Overview',      href: '/analytics',   icon: LayoutDashboard },
      { name: 'AI Agents',     href: '/agents',      icon: Bot },
      { name: 'Campaigns',     href: '/campaigns',   icon: Megaphone },
    ],
  },
  {
    title: 'Manage',
    items: [
      { name: 'Phone Numbers', href: '/numbers',     icon: Phone },
      { name: 'Audiences',     href: '/audiences',   icon: Users },
      { name: 'Knowledge Base',href: '/kb',          icon: BookOpen },
    ],
  },
  {
    title: 'Observe',
    items: [
      { name: 'Call Logs',     href: '/call-logs',   icon: Headphones },
      { name: 'Analytics',     href: '/analytics',   icon: BarChart2 },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'Settings',      href: '/settings',    icon: Settings },
    ],
  },
];

const superAdminNav = [
  {
    title: 'Super Admin',
    items: [
      { name: 'Platform Overview', href: '/admin',         icon: ShieldCheck },
      { name: 'Client Accounts',   href: '/admin/clients', icon: Building2 },
    ],
  },
];

interface NavItemProps {
  name: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
}

function NavItem({ name, href, icon: Icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn('sidebar-item group', active && 'active')}
    >
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1 truncate">{name}</span>
      {active && <ChevronRight size={12} className="opacity-40" />}
    </Link>
  );
}

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

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <aside className="sidebar">
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={14} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="sidebar-logo-text">Cogniflow</span>
          {isSuperAdmin && (
            <div style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1, marginTop: 2 }}>
              Super Admin
            </div>
          )}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {/* Super admin nav at top if applicable */}
        {isSuperAdmin && superAdminNav.map((group) => (
          <div key={group.title}>
            <div className="sidebar-group-label" style={{ color: 'var(--primary)' }}>{group.title}</div>
            {group.items.map((item) => (
              <NavItem key={item.name} {...item} active={isActive(item.href)} />
            ))}
            <Separator className="my-3" style={{ background: 'var(--border)' }} />
          </div>
        ))}

        {/* Standard nav */}
        {userNav.map((group) => (
          <div key={group.title}>
            <div className="sidebar-group-label">{group.title}</div>
            {group.items.map((item) => (
              <NavItem key={item.name} {...item} active={isActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
          <Avatar style={{ width: 30, height: 30, flexShrink: 0 }}>
            <AvatarFallback style={{
              background: 'var(--primary)',
              color: 'var(--primary-foreground)', fontSize: 11, fontWeight: 700,
            }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? '—'}
            </p>
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isSuperAdmin ? '🛡 Super Admin' : user?.email ?? ''}
            </p>
          </div>
          <button
            id="sidebar-logout"
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 6,
              transition: 'color 0.12s', flexShrink: 0,
            }}
            onMouseOver={e => (e.currentTarget.style.color = '#f87171')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
