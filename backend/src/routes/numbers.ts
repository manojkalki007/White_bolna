import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { BOLNA_DEFAULT_BASE_URL } from '../lib/bolna';

const router = Router();
router.use(requireAuth);

async function getOrgFromReq(req: AuthRequest) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: req.user!.organizationId },
    select: { bolnaApiKey: true, bolnaBaseUrl: true },
  });
}

// GET /api/numbers — list acquired phone numbers for this org's Bolna workspace
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);
    const apiKey = org.bolnaApiKey ?? process.env.BOLNA_API_KEY ?? '';
    const baseURL = org.bolnaBaseUrl ?? BOLNA_DEFAULT_BASE_URL;

    const client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    const response = await client.get('/phone-numbers');
    const raw = response.data?.data ?? response.data ?? [];

    const numbers = (Array.isArray(raw) ? raw : []).map((n: any) => ({
      id: n.id ?? n._id,
      phone_number: n.phone_number ?? n.phoneNumber ?? '',
      country: n.country ?? n.attributes?.provider ?? '',
      status: n.status ?? (n.isActive ? 'active' : 'inactive'),
      agent_id: n.agent_id ?? n.agentId ?? null,
      capabilities: { voice: true },
    }));

    res.json({ success: true, data: numbers });
  })
);

export default router;
