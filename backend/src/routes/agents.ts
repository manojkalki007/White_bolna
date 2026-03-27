/**
 * agents.ts
 *
 * POST /api/agents        — Create a Bolna agent (in Bolna + local DB mirror)
 * GET  /api/agents        — List all agents for the authenticated org
 * GET  /api/agents/:id    — Retrieve agent config for the UI builder
 * PUT  /api/agents/:id    — Update agent (synced to Bolna)
 * DELETE /api/agents/:id  — Soft-deactivate agent
 */

import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import prisma from '../lib/prisma';
import {
  getOrgClient,
  createBolnaAgent,
  updateBolnaAgent,
  listBolnaAgents,
  getBolnaAgent,
} from '../lib/bolna';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

// ─── Fetch org credentials from DB ───────────────────────────────────────────
async function getOrgCredentials(organizationId: string) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      id: true,
      isActive: true,
      creditBalance: true,
      bolnaApiKey: true,
      bolnaBaseUrl: true,
    },
  });
}

// ─── Validation Schemas ───────────────────────────────────────────────────────
const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  welcomeMessage: z.string().optional(),

  // LLM
  llmModel: z.string().default('gpt-4o-mini'),
  llmProvider: z.string().default('openai'),
  temperature: z.number().min(0).max(2).default(0.7),

  // Voice
  voiceId: z.string().default('ritu'),
  voiceProvider: z.string().default('bolna'),
  language: z.string().default('en'),

  // Telephony
  fromNumber: z.string().optional(),

  // Latency optimization
  ambientNoiseDetection: z.boolean().default(true),
  interruptionThreshold: z.number().min(0).max(1).default(0.5),
  bufferingDelay: z.number().int().min(0).max(2000).default(100),
});

type CreateAgentInput = z.infer<typeof CreateAgentSchema>;

// ─── POST /api/agents ─────────────────────────────────────────────────────────
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = CreateAgentSchema.safeParse(req.body);
    if (!parsed.success) throw createError(parsed.error.message, 400);

    const data: CreateAgentInput = parsed.data;
    const org = await getOrgCredentials(req.user!.organizationId);

    if (!org.isActive) throw createError('Organization account is suspended', 403);

    // Build Bolna agent creation payload
    const bolnaPayload = {
      agent_name: data.name,
      agent_welcome_message: data.welcomeMessage ?? '',
      llm_config: {
        model: data.llmModel,
        system_prompt: data.systemPrompt,
        temperature: data.temperature,
      },
      voice_config: {
        voice_id: data.voiceId,
        provider: data.voiceProvider,
        language: data.language,
      },
      latency_config: {
        ambient_noise_detection: data.ambientNoiseDetection,
        interruption_threshold: data.interruptionThreshold,
        buffering_delay_ms: data.bufferingDelay,
      },
    };

    // Create in Bolna first
    const bolnaResponse = await createBolnaAgent(bolnaPayload, org);

    // Mirror in local DB
    const agent = await prisma.bolnaAgent.create({
      data: {
        organizationId: org.id,
        bolnaAgentId: bolnaResponse.agent_id,
        name: data.name,
        systemPrompt: data.systemPrompt,
        welcomeMessage: data.welcomeMessage ?? null,
        llmModel: data.llmModel,
        llmProvider: data.llmProvider,
        temperature: data.temperature,
        voiceId: data.voiceId,
        voiceProvider: data.voiceProvider,
        language: data.language,
        fromNumber: data.fromNumber ?? null,
        ambientNoiseDetection: data.ambientNoiseDetection,
        interruptionThreshold: data.interruptionThreshold,
        bufferingDelay: data.bufferingDelay,
        rawConfig: bolnaPayload as any,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({ success: true, data: agent });
  })
);

// ─── POST /api/agents/sync ───────────────────────────────────────────────────
router.post(
  '/sync',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const org = await getOrgCredentials(req.user!.organizationId);
    const bolnaAgents = await listBolnaAgents(org);
    
    let syncedCount = 0;
    
    for (const bAgent of bolnaAgents) {
      const agentId = bAgent.agent_id || bAgent.id;
      if (!agentId) continue;
      
      const existing = await prisma.bolnaAgent.findFirst({
        where: { bolnaAgentId: agentId, organizationId: org.id }
      });
      
      if (!existing) {
        // Extract configs safely
        const agentName = bAgent.agent_name || bAgent.name || 'Imported Agent';
        // When pulling from /agent/all, configs are buried under tasks[0].tools_config
        const task0 = (bAgent.tasks && bAgent.tasks[0]) || {};
        const toolsConfig = task0.tools_config || {};
        const llmConfig = toolsConfig.llm_agent?.llm_config || {};
        const synthesizer = toolsConfig.synthesizer?.provider_config || {};
        
        await prisma.bolnaAgent.create({
          data: {
            organizationId: org.id,
            bolnaAgentId: agentId,
            name: agentName,
            systemPrompt: bAgent.agent_prompts?.task_1?.system_prompt || '(Imported)',
            llmModel: llmConfig.model || 'gpt-4o-mini',
            llmProvider: 'openai',
            temperature: llmConfig.temperature || 0.7,
            voiceId: synthesizer.voice_id || 'ritu',
            voiceProvider: synthesizer.provider || 'bolna',
            language: synthesizer.language || 'en',
            ambientNoiseDetection: true,
            interruptionThreshold: 0.5,
            bufferingDelay: 100,
            rawConfig: bAgent as any,
            status: 'ACTIVE',
          }
        });
        syncedCount++;
      }
    }
    
    res.json({ success: true, syncedCount });
  })
);

// ─── GET /api/agents ─────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '20', status, organizationId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // If Super Admin, they can view all agents, or filter by specific organizationId.
    // Standard accounts are strictly isolated to their own organizationId.
    const where: any = req.user!.role === 'SUPER_ADMIN' 
      ? (organizationId ? { organizationId } : {})
      : { organizationId: req.user!.organizationId };

    if (status) where.status = status;

    const [agents, total] = await Promise.all([
      prisma.bolnaAgent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          _count: { select: { campaigns: true, callLogs: true } },
          organization: { select: { name: true, brandName: true } } // Show which client owns the agent
        },
      }),
      prisma.bolnaAgent.count({ where }),
    ]);

    res.json({ success: true, data: agents, total, page: parseInt(page) });
  })
);

// ─── GET /api/agents/:id ─────────────────────────────────────────────────────
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const agent = await prisma.bolnaAgent.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId, // strict tenant isolation
      },
      include: {
        _count: { select: { campaigns: true, callLogs: true } },
      },
    });

    if (!agent) throw createError('Agent not found', 404);

    // Optionally fetch live config from Bolna for comparison
    let liveConfig: unknown = null;
    try {
      const org = await getOrgCredentials(req.user!.organizationId);
      liveConfig = await getBolnaAgent(agent.bolnaAgentId, org);
    } catch {
      // Non-fatal — return local config if Bolna is unreachable
    }

    res.json({ success: true, data: { ...agent, liveConfig } });
  })
);

// ─── PUT /api/agents/:id ──────────────────────────────────────────────────────
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const UpdateSchema = CreateAgentSchema.partial();
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) throw createError(parsed.error.message, 400);

    const existing = await prisma.bolnaAgent.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw createError('Agent not found', 404);

    const org = await getOrgCredentials(req.user!.organizationId);
    const data = parsed.data;

    // Build Bolna update payload (only include changed fields)
    const bolnaUpdate: Record<string, unknown> = {};
    if (data.name) bolnaUpdate.agent_name = data.name;
    if (data.welcomeMessage !== undefined) bolnaUpdate.agent_welcome_message = data.welcomeMessage;
    if (data.systemPrompt || data.llmModel || data.temperature !== undefined) {
      bolnaUpdate.llm_config = {
        model: data.llmModel ?? existing.llmModel,
        system_prompt: data.systemPrompt ?? existing.systemPrompt,
        temperature: data.temperature ?? existing.temperature,
      };
    }
    if (data.voiceId || data.voiceProvider || data.language) {
      bolnaUpdate.voice_config = {
        voice_id: data.voiceId ?? existing.voiceId,
        provider: data.voiceProvider ?? existing.voiceProvider,
        language: data.language ?? existing.language,
      };
    }
    if (data.ambientNoiseDetection !== undefined || data.interruptionThreshold !== undefined || data.bufferingDelay !== undefined) {
      bolnaUpdate.latency_config = {
        ambient_noise_detection: data.ambientNoiseDetection ?? existing.ambientNoiseDetection,
        interruption_threshold: data.interruptionThreshold ?? existing.interruptionThreshold,
        buffering_delay_ms: data.bufferingDelay ?? existing.bufferingDelay,
      };
    }

    // Push update to Bolna
    await updateBolnaAgent(existing.bolnaAgentId, bolnaUpdate as any, org);

    // Update local mirror
    const updated = await prisma.bolnaAgent.update({
      where: { id: req.params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.systemPrompt && { systemPrompt: data.systemPrompt }),
        ...(data.welcomeMessage !== undefined && { welcomeMessage: data.welcomeMessage }),
        ...(data.llmModel && { llmModel: data.llmModel }),
        ...(data.llmProvider && { llmProvider: data.llmProvider }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.voiceId && { voiceId: data.voiceId }),
        ...(data.voiceProvider && { voiceProvider: data.voiceProvider }),
        ...(data.language && { language: data.language }),
        ...(data.fromNumber !== undefined && { fromNumber: data.fromNumber }),
        ...(data.ambientNoiseDetection !== undefined && { ambientNoiseDetection: data.ambientNoiseDetection }),
        ...(data.interruptionThreshold !== undefined && { interruptionThreshold: data.interruptionThreshold }),
        ...(data.bufferingDelay !== undefined && { bufferingDelay: data.bufferingDelay }),
        rawConfig: bolnaUpdate as any,
      },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── DELETE /api/agents/:id — soft deactivate ─────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const existing = await prisma.bolnaAgent.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw createError('Agent not found', 404);

    await prisma.bolnaAgent.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' },
    });

    res.json({ success: true, message: 'Agent deactivated' });
  })
);

export default router;
