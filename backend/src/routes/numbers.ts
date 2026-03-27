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

    let raw: any[] = [];
    
    try {
      // Some versions of Bolna reject un-parameterized /phone-numbers
      const response = await client.get('/phone-numbers');
      raw = response.data?.data ?? response.data ?? [];
    } catch (err: any) {
      // Fallback: If Bolna restricts the direct list query, infer the active DIDs from our known agent configs
      if (err.response?.status === 400 || err.response?.status === 404) {
        const localAgents = await prisma.bolnaAgent.findMany({
          where: { organizationId: req.user!.organizationId },
          select: { fromNumber: true, name: true, id: true }
        });
        
        raw = localAgents
          .filter(a => a.fromNumber)
          .map(a => ({
            id: a.id,
            phone_number: a.fromNumber,
            friendlyName: `Agent Assignment: ${a.name}`,
            status: 'active',
            capabilities: { voice: true }
          }));
      } else {
        throw err;
      }
    }

    const numbers = (Array.isArray(raw) ? raw : []).map((n: any) => ({
      id: n.id ?? n._id,
      phone_number: n.phone_number ?? n.phoneNumber ?? '',
      country: n.country ?? n.attributes?.provider ?? 'US/IN',
      status: n.status ?? (n.isActive ? 'active' : 'inactive'),
      agent_id: n.agent_id ?? n.agentId ?? null,
      friendlyName: n.friendlyName ?? null,
      capabilities: n.capabilities || { voice: true },
    }));

    res.json({ success: true, data: numbers });
  })
);

export default router;
