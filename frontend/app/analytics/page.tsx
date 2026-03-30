/**
 * app/analytics/page.tsx
 *
 * Next.js App Router page — this IS a Server Component by default.
 *
 * Architecture:
 *   <Suspense> streams the skeleton to the browser instantly, while the
 *   async DashboardContent fetches data on the server in parallel.
 *   The chart (CallChart) is a 'use client' island — the only JS sent to
 *   the browser for this entire page.
 */

import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

export const metadata = {
  title: 'Analytics — Cogniflow',
  description: 'Real-time voice AI telephony analytics dashboard',
};

// Disable static caching for this page — data should always be fresh
export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {/*
        DashboardContent is an async Server Component.
        Next.js will stream the resolved HTML once all fetches complete.
        The client receives the skeleton first, then the real content.
        No organizationId is passed here — DashboardContent handles the case
        where auth context must come from cookies/headers (todo: wire server auth).
        For now the backend returns all-org data when org is omitted.
      */}
      <DashboardContent />
    </Suspense>
  );
}
