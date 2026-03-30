/**
 * components/dashboard/KpiCard.tsx
 *
 * Pure Server Component — no 'use client' directive.
 * Renders a single top-level KPI metric card.
 * Receives pre-fetched data as props (no fetching, no hooks).
 */

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  title: string;
  value: string | number;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
  sub1?: string;
  sub2?: string;
  accentColor?: string;
  icon?: LucideIcon;
}

export function KpiCard({
  title,
  value,
  badge,
  trend = 'neutral',
  sub1,
  sub2,
  accentColor = '#e11d48',
  icon: Icon,
}: KpiCardProps) {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;
  const trendColor = trend === 'down' ? '#f87171' : trend === 'up' ? '#4ade80' : '#a1a1aa';

  return (
    <Card style={{
      background: '#121214',
      border: '1px solid #27272a',
      borderRadius: 12,
      boxShadow: 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 100, height: 100,
        borderRadius: '50%', background: accentColor, opacity: 0.04, filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      <CardContent style={{ padding: '20px 24px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {Icon && (
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={14} color={accentColor} />
              </div>
            )}
            <p style={{ color: '#a1a1aa', fontSize: 12.5, fontWeight: 500, margin: 0 }}>
              {title}
            </p>
          </div>
          {badge && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,0.05)',
              padding: '3px 8px', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <TrendIcon size={11} color={trendColor} />
              <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>{badge}</span>
            </div>
          )}
        </div>

        {/* Value */}
        <h2 style={{
          fontSize: 32, fontWeight: 700, margin: '0 0 16px 0',
          color: '#fafafa', letterSpacing: '-0.8px', lineHeight: 1,
        }}>
          {value}
        </h2>

        {/* Subtext */}
        {(sub1 || sub2) && (
          <div>
            {sub1 && <p style={{ fontSize: 11.5, color: '#e4e4e7', fontWeight: 500, margin: '0 0 3px 0' }}>{sub1}</p>}
            {sub2 && <p style={{ fontSize: 11.5, color: '#71717a', margin: 0 }}>{sub2}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
