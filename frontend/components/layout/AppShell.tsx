'use client';

import { useAuth } from '@/providers/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PUBLIC_PATHS = ['/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isLoading && !user && !isPublic) router.push('/login');
    if (!isLoading && user && isPublic) router.push('/analytics');
  }, [user, isLoading, isPublic, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (isPublic) return <>{children}</>;
  if (!user) return null;

  return (
    <div className="app-shell" data-theme={user.role === 'SUPER_ADMIN' ? 'superadmin' : undefined}>
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
