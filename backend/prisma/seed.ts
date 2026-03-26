/**
 * prisma/seed.ts
 *
 * Bootstraps the database with:
 *  1. A SUPER_ADMIN user (platform owner)
 *  2. A demo Organization (for local development)
 *  3. A sample BolnaAgent attached to the demo org
 *
 * Run with:  npx ts-node prisma/seed.ts
 * Or via:    npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ── 1. Super Admin Org ────────────────────────────────────────────────────
  const superAdminOrg = await prisma.organization.upsert({
    where: { slug: 'platform-admin' },
    update: {},
    create: {
      name: 'Platform Admin',
      slug: 'platform-admin',
      plan: 'ENTERPRISE',
      creditBalance: 99999,
      creditLimit: 99999,
      brandName: 'VoiceAI Platform',
      primaryColor: '#6366f1',
      isActive: true,
    },
  });

  // ── 2. Super Admin User ───────────────────────────────────────────────────
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL ?? 'admin@voiceai.dev';
  const superAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@123456';
  const superAdminName =
    process.env.SUPER_ADMIN_NAME ?? 'Platform Admin';

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: superAdminName,
      email: superAdminEmail,
      passwordHash: await bcrypt.hash(superAdminPassword, 10),
      role: 'SUPER_ADMIN',
      organizationId: superAdminOrg.id,
    },
  });

  console.log(`✅ Super admin: ${superAdmin.email}`);

  // ── 3. Demo Tenant Org ────────────────────────────────────────────────────
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corp',
      slug: 'demo-corp',
      plan: 'PRO',
      creditBalance: 500,
      creditLimit: 1000,
      brandName: 'Demo Corp Calls',
      primaryColor: '#8b5cf6',
      bolnaApiKey: process.env.BOLNA_API_KEY ?? null, // uses env key for demo
      isActive: true,
    },
  });

  // Demo ADMIN user
  const demoAdminEmail = 'demo@democorp.com';
  const demoAdmin = await prisma.user.upsert({
    where: { email: demoAdminEmail },
    update: {},
    create: {
      name: 'Demo Admin',
      email: demoAdminEmail,
      passwordHash: await bcrypt.hash('Demo@123456', 10),
      role: 'ADMIN',
      organizationId: demoOrg.id,
    },
  });

  console.log(`✅ Demo admin: ${demoAdmin.email}`);

  // ── 4. Sample BolnaAgent ──────────────────────────────────────────────────
  // We use a placeholder bolnaAgentId — replace with a real one after running
  // POST /api/agents from the UI.
  const PLACEHOLDER_AGENT_ID = 'bolna_agent_seed_placeholder';

  const existingAgent = await prisma.bolnaAgent.findFirst({
    where: { organizationId: demoOrg.id },
  });

  if (!existingAgent) {
    const agent = await prisma.bolnaAgent.create({
      data: {
        organizationId: demoOrg.id,
        bolnaAgentId: PLACEHOLDER_AGENT_ID,
        name: 'Demo Sales Agent',
        status: 'ACTIVE',
        systemPrompt: `You are a friendly and professional sales representative for Demo Corp.
Your goal is to introduce our product, understand the prospect's needs, and schedule a demo call.
Be concise, warm, and never pushy. Always listen before speaking.`,
        welcomeMessage: 'Hi! This is Alex from Demo Corp. Do you have a quick moment to chat?',
        llmModel: 'gpt-4o-mini',
        llmProvider: 'openai',
        temperature: 0.7,
        voiceId: 'ritu',
        voiceProvider: 'bolna',
        language: 'en',
        ambientNoiseDetection: true,
        interruptionThreshold: 0.5,
        bufferingDelay: 100,
      },
    });

    console.log(`✅ Sample agent created: ${agent.name} (id: ${agent.id})`);
    console.log(
      `   ⚠️  bolnaAgentId is a placeholder. Create a real agent via POST /api/agents.`
    );
  } else {
    console.log(`ℹ️  Agent already exists for demo org — skipping.`);
  }

  console.log('');
  console.log('✅ Database seeded successfully.');
  console.log('');
  console.log('Credentials:');
  console.log(`  Super Admin   : ${superAdminEmail} / ${superAdminPassword}`);
  console.log(`  Demo Admin    : ${demoAdminEmail} / Demo@123456`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
