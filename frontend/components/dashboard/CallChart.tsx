/**
 * components/dashboard/CallChart.tsx
 *
 * 'use client' — Recharts requires browser APIs (SVG rendering).
 * This is the ONLY client boundary in the dashboard.
 * Receives already-fetched data as props from a Server Component parent.
 */

'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface DayData {
  label: string;
  total: number;
  connected: number;
  failed: number;
}

interface CallChartProps {
  data: DayData[];
  connectionRate: number;
  totalCalls: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#18181b', border: '1px solid #27272a',
      padding: '10px 14px', borderRadius: 8, fontSize: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    }}>
      <p style={{ margin: '0 0 6px', color: '#a1a1aa', fontWeight: 500 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: '2px 0', fontWeight: 600, color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function CallChart({ data, connectionRate, totalCalls }: CallChartProps) {
  return (
    <Card style={{
      background: '#121214', border: '1px solid #27272a',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'none',
    }}>
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#f4f4f5' }}>
            Call Connection Trajectory
          </h3>
          <p style={{ margin: 0, fontSize: 12.5, color: '#71717a' }}>
            Last 7 days · {totalCalls.toLocaleString()} total calls · {connectionRate}% connected
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11.5 }}>
          {[
            { color: '#e11d48', label: 'Connected' },
            { color: '#9f1239', label: 'Total' },
            { color: '#f97316', label: 'Failed' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a1a1aa' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <CardContent style={{ padding: '16px 0 0' }}>
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#9f1239" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#9f1239" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gConnected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e11d48" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="label" stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false} axisLine={false} dy={8}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false} axisLine={false} width={32}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="total"     name="Total"     stroke="#9f1239" strokeWidth={2} fillOpacity={1} fill="url(#gTotal)"     />
              <Area type="monotone" dataKey="connected" name="Connected" stroke="#e11d48" strokeWidth={2.5} fillOpacity={1} fill="url(#gConnected)" />
              <Area type="monotone" dataKey="failed"    name="Failed"    stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#gFailed)"    />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
