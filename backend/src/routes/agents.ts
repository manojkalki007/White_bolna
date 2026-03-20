import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrgClient } from '../lib/smallestai';
import prisma from '../lib/prisma';

const router = Router();

// All agent routes require auth so we can use the org's API key
router.use(requireAuth);

async function getOrgFromReq(req: AuthRequest) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: req.user!.organizationId },
    select: { smallestAiApiKey: true, smallestAiBaseUrl: true },
  });
}

// GET /api/agents — list all agents for this org's Smallest.ai workspace
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);
    const client = getOrgClient(org);
    const response = await client.get('/agent');
    const agents = response.data?.data?.agents ?? response.data?.data ?? [];
    res.json({ success: true, data: agents });
  })
);

// GET /api/agents/:id — get a single agent
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);
    const client = getOrgClient(org);
    const response = await client.get(`/agent/${req.params.id}`);
    res.json({ success: true, data: response.data?.data ?? response.data });
  })
);

export default router;
