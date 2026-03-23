const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findUnique({
    where: { email: 'manojkalki007@gmail.com' },
    include: { organization: true },
  });

  if (!user) {
    console.log('❌ USER NOT FOUND');
    return;
  }

  console.log('\n✅ SUPER ADMIN CONNECTION CHECK');
  console.log('───────────────────────────────────────────');
  console.log('Name   :', user.name);
  console.log('Email  :', user.email);
  console.log('Role   :', user.role);
  console.log('Org    :', user.organization.name);
  console.log('Plan   :', user.organization.plan);
  console.log('Active :', user.organization.isActive);
  console.log('API Key:', user.organization.smallestAiApiKey ? '✅ Set' : '⚠️  Not set');
  console.log('───────────────────────────────────────────');

  const orgCount  = await p.organization.count();
  const userCount = await p.user.count();
  const campCount = await p.campaign.count();
  const callCount = await p.callLog.count();

  console.log('\n📊 PLATFORM DB TOTALS');
  console.log('Organisations :', orgCount);
  console.log('Users         :', userCount);
  console.log('Campaigns     :', campCount);
  console.log('Call Logs     :', callCount);
  console.log('');
}

main()
  .catch((e) => console.error('Error:', e.message))
  .finally(() => p.$disconnect());
