import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getOrgClient } from '../lib/smallestai';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

async function getOrgFromReq(req: AuthRequest) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: req.user!.organizationId },
    select: { smallestAiApiKey: true, smallestAiBaseUrl: true },
  });
}

// GET /api/kb
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const org = await getOrgFromReq(req);
      const client = getOrgClient(org);
      const response = await client.get('/knowledgebase');
      const kbs =
        response.data?.data?.knowledgeBases ??
        response.data?.data ??
        response.data ??
        [];
      res.json({ success: true, data: kbs });
    } catch {
      res.json({ success: true, data: [] });
    }
  })
);

// GET /api/kb/:id
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);
    const client = getOrgClient(org);
    const response = await client.get(`/knowledgebase/${req.params.id}`);
    res.json({ success: true, data: response.data?.data ?? response.data });
  })
);

// POST /api/kb
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);
    const client = getOrgClient(org);
    const response = await client.post('/knowledgebase', req.body);
    res.status(201).json({ success: true, data: response.data?.data ?? response.data });
  })
);

// DELETE /api/kb/:id
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgFromReq(req);
    const client = getOrgClient(org);
    const response = await client.delete(`/knowledgebase/${req.params.id}`);
    res.json({ success: true, data: response.data });
  })
);

export default router;
