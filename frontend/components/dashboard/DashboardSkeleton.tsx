/**
 * components/dashboard/DashboardSkeleton.tsx
 *
 * Server Component — pure static skeleton used inside <Suspense fallback={...}>
 * Mirrors the exact layout of the live dashboard with shimmer placeholders.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton style={{ height: 22, width: 220 }} />
          <Skeleton style={{ height: 14, width: 300 }} />
        </div>
        <Skeleton style={{ height: 34, width: 160, borderRadius: 8 }} />
      </div>

      {/* KPI cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 12 }}>
            <CardContent style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton style={{ height: 12, width: 120 }} />
              <Skeleton style={{ height: 36, width: 90 }} />
              <Skeleton style={{ height: 10, width: 150 }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 12 }}>
        <CardContent style={{ padding: '20px 24px' }}>
          <Skeleton style={{ height: 18, width: 200, marginBottom: 8 }} />
          <Skeleton style={{ height: 12, width: 280, marginBottom: 24 }} />
          <Skeleton style={{ height: 280, width: '100%', borderRadius: 8 }} />
        </CardContent>
      </Card>

      {/* Bottom row skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[0, 1].map(i => (
          <Card key={i} style={{ background: '#121214', border: '1px solid #27272a', borderRadius: 12 }}>
            <CardContent style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton style={{ height: 14, width: 160 }} />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} style={{ height: 36, width: '100%', borderRadius: 6 }} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
