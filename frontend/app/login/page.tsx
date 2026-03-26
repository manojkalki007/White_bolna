'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, Zap, Phone, Bot, BarChart2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [isPaused, setIsPaused]   = useState(false);
  const [success, setSuccess]     = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setIsPaused(false);
    setLoading(true);
    try {
      await login(email, password);
      setSuccess(true);
      setTimeout(() => router.push('/analytics'), 600);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
      const msg    = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid email or password.';
      if (status === 503) {
        setIsPaused(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Bot,       label: 'AI Voice Agents',     sub: 'Build & deploy in minutes'    },
    { icon: Phone,     label: 'Bulk Campaigns',      sub: 'Reach thousands instantly'    },
    { icon: BarChart2, label: 'Real-Time Analytics', sub: 'Live call metrics & insights' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 80px',
        background: 'linear-gradient(135deg, #0d0d18 0%, #111128 100%)',
        borderRight: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* grid bg */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* glow */}
        <div style={{
          position: 'absolute', top: -200, left: -200,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
            }}>
              <Zap size={22} color="white" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Cogniflow
            </span>
          </div>

          <h1 style={{ margin: '0 0 12px', fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-1px' }}>
            Voice AI<br />
            <span style={{ background: 'linear-gradient(90deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              That Converts
            </span>
          </h1>
          <p style={{ margin: '0 0 52px', fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            White-label AI calling platform.<br />Deploy agents, run campaigns, close more.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {features.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={18} color="#818cf8" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{f.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Welcome back
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            Sign in to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="label">Email address</label>
            <input
              id="login-email"
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Paused project warning */}
          {isPaused && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, fontSize: 13,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b', lineHeight: 1.5,
            }}>
              <strong>⚠️ Supabase project is paused.</strong><br />
              Free-tier projects pause after inactivity.{' '}
              <a
                href="https://supabase.com/dashboard/project/cbpzsvzfoquowbldtsrh"
                target="_blank" rel="noreferrer"
                style={{ color: '#fbbf24', fontWeight: 700, textDecoration: 'underline' }}
              >
                Click here to restore it →
              </a>
              <br />
              <span style={{ fontSize: 11, opacity: 0.8 }}>After restoring, wait ~30 seconds and try again.</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 15, fontWeight: 700, marginTop: 4 }}
          >
            {success ? (
              <><CheckCircle2 size={16} /> Signed in!</>
            ) : loading ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: 32, padding: '14px 16px', borderRadius: 10,
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Super Admin Credentials
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            manojkalki007@gmail.com
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            Cogniflowsuper@2026
          </p>
        </div>
      </div>
    </div>
  );
}
