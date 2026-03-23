import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// All number routes require auth so we can use the org's API key
router.use(requireAuth);

async function getOrgFromReq(req: AuthRequest) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: req.user!.organizationId },
    select: { smallestAiApiKey: true, smallestAiBaseUrl: true },
  });
}

/**
 * Phone numbers live on a DIFFERENT base URL than the agents API:
 *   Agents:  https://atoms-api.smallest.ai/api/v1/agent
 *   Numbers: https://api.smallest.ai/atoms/v1/product/phone-numbers
 *
 * Reference: https://docs.smallest.ai/atoms/api-reference/api-reference/phone-numbers/get-acquired-phone-numbers
 */
const PHONE_NUMBERS_BASE = 'https://api.smallest.ai/atoms/v1';

// GET /api/numbers — list acquired phone numbers for this org
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);

    // Use org API key, fall back to global env key
    const apiKey = org.smallestAiApiKey ?? process.env.SMALLEST_AI_API_KEY ?? '';

    const client = axios.create({
      baseURL: PHONE_NUMBERS_BASE,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    const response = await client.get('/product/phone-numbers');
    const raw = response.data?.data ?? response.data ?? [];

    // Normalize: each number has attributes.phoneNumber and attributes.provider
    const numbers = (Array.isArray(raw) ? raw : []).map((n: any) => ({
      id: n._id,
      phone_number: n.attributes?.phoneNumber ?? n.phoneNumber ?? '',
      country: n.attributes?.provider ?? '',
      status: n.isActive ? 'active' : 'inactive',
      agent_id: n.agentId ?? null,
      capabilities: { voice: true },
    }));

    res.json({ success: true, data: numbers });
  })
);

export default router;
