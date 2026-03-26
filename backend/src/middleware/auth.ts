import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import prisma from '../lib/prisma';

export interface AuthUser {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  supabaseUid: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware: verify Supabase JWT and attach user profile to request.
 *
 * Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify with Supabase Auth (supabaseAdmin.auth.getUser)
 * 3. Look up our User record in DB by supabase_uid (or email)
 * 4. Attach full user+org profile to req.user
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify the Supabase JWT
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    // 2. Fetch our User record (contains org + role context)
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseUid: supabaseUser.id },
          { email: supabaseUser.email! },
        ],
      },
      include: { organization: true },
    });

    if (!dbUser) {
      res.status(401).json({ success: false, error: 'User not found in database' });
      return;
    }

    // 3. Attach to request
    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      organizationId: dbUser.organizationId,
      role: dbUser.role,
      supabaseUid: supabaseUser.id,
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token verification failed' });
  }
}

/**
 * Require SUPER_ADMIN role. Must be used after requireAuth.
 */
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Forbidden: Super Admin only' });
    return;
  }
  next();
}
