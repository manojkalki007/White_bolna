'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Phone,
  Megaphone,
  Briefcase,
  Activity,
  BarChart,
  Bot,
  LogOut,
} from 'lucide-react';
import { cn } from '../ui';
import { useAuth } from '@/providers/AuthProvider';

const navGroups = [
  {
    title: 'Build',
    items: [
      { name: 'Agents', href: '/agents', icon: Bot },
      { name: 'Knowledge Base', href: '/kb', icon: Briefcase },
    ],
  },
  {
    title: 'Deploy',
    items: [
      { name: 'Phone Numbers', href: '/numbers', icon: Phone },
      { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
      { name: 'Audiences', href: '/audiences', icon: Briefcase },
    ],
  },
  {
    title: 'Observe',
    items: [
      { name: 'Call Logs', href: '/call-logs', icon: Activity },
      { name: 'Analytics', href: '/analytics', icon: BarChart },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Integrations', href: '/settings/integrations', icon: BarChart },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AT';

  return (
    <div className="flex w-64 flex-col overflow-y-auto border-r border-gray-200 bg-white pt-5 pb-4">
      <div className="flex shrink-0 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-400 text-white font-bold shadow-sm">
            C
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Cogniflow</span>
        </Link>
      </div>

      <div className="mt-8 flex flex-col flex-grow">
        <nav className="flex-1 space-y-6 px-3" aria-label="Sidebar">
          {navGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {group.title}
              </h3>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        isActive
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center rounded-md px-3 py-2 text-sm font-medium'
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? 'text-teal-700' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 shrink-0 h-5 w-5'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User footer */}
      <div className="mt-auto px-3 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? '—'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.organizationName ?? '—'}</p>
          </div>
          <button
            id="sidebar-logout"
            onClick={handleLogout}
            title="Sign out"
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
