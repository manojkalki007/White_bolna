import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Helper: Supabase calls with 10s timeout ───────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(8),
  orgName:  z.string().min(1),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// 1. Creates Supabase Auth user
// 2. Creates Organisation + User record in our DB
// 3. Returns Supabase session (access_token used as Bearer everywhere)

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const { name, email, password, orgName } = parsed.data;

    // Check if already registered in our DB
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, orgName },
      });

    if (authError || !authData.user) {
      res.status(400).json({ success: false, error: authError?.message ?? 'Failed to create auth user' });
      return;
    }

    // Create org + user in our DB
    const orgSlug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName, slug: orgSlug },
      });
      return tx.user.create({
        data: {
          name,
          email,
          passwordHash: '(supabase-managed)',
          supabaseUid: authData.user.id,
          organizationId: org.id,
          role: 'ADMIN',
        },
        include: { organization: true },
      });
    });

    // Sign in to get session tokens
    const { data: session, error: signInError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

    // Return user + ask frontend to sign in with password
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please sign in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    });
  })
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Delegates to Supabase Auth, returns session.access_token as the Bearer token.

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const { email, password } = parsed.data;

    // Authenticate via Supabase (10s timeout guard)
    let session, authError;
    try {
      const result = await withTimeout(
        supabaseAdmin.auth.signInWithPassword({ email, password })
      );
      session = result.data;
      authError = result.error;
    } catch (timeoutErr: unknown) {
      const msg = (timeoutErr as Error)?.message;
      if (msg === 'SUPABASE_TIMEOUT') {
        res.status(503).json({
          success: false,
          error: 'Authentication service unavailable — Supabase project may be paused. Please visit supabase.com/dashboard to restore it.',
        });
      } else {
        res.status(503).json({ success: false, error: 'Authentication service unreachable. Try again in a moment.' });
      }
      return;
    }

    if (authError || !session.session) {
      // Fall back: if user exists in our DB but not Supabase, migrate them
      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (dbUser) {
        // Auto-migrate: create Supabase user for existing DB user
        const { data: authData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: dbUser.name },
          });

        if (createError || !authData?.user) {
          res.status(401).json({ success: false, error: 'Invalid email or password' });
          return;
        }

        // Link supabase UID to existing user
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { supabaseUid: authData.user.id },
        });

        // Now sign in
        const { data: retrySession, error: retryError } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });

        if (retryError || !retrySession.session) {
          res.status(401).json({ success: false, error: 'Authentication failed' });
          return;
        }

        res.json({
          success: true,
          token: retrySession.session.access_token,
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            organizationId: dbUser.organizationId,
            organizationName: dbUser.organization.name,
          },
        });
        return;
      }

      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Get our DB user record
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseUid: session.user.id },
          { email: session.user.email! },
        ],
      },
      include: { organization: true },
    });

    if (!dbUser) {
      res.status(401).json({ success: false, error: 'User not found. Please register first.' });
      return;
    }

    // Keep supabaseUid in sync
    if (!dbUser.supabaseUid) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { supabaseUid: session.user.id },
      });
    }

    res.json({
      success: true,
      token: session.session.access_token,        // ← Supabase JWT
      refreshToken: session.session.refresh_token, // ← for refreshing
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        organizationId: dbUser.organizationId,
        organizationName: dbUser.organization.name,
      },
    });
  })
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
// Exchange a refresh token for a new access token.

router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Missing refreshToken' });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    res.json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  })
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { organization: true },
    });

    if (!dbUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        organizationId: dbUser.organizationId,
        organizationName: dbUser.organization.name,
      },
    });
  })
);

export default router;
