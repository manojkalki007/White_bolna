const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'manojkalki007@gmail.com';
  const name = 'kalki';
  const password = 'Superadmin@2026';
  const orgName = 'Cogniflow';

  // Check if already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Already exists — just upgrade role to SUPER_ADMIN
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
      include: { organization: true },
    });
    console.log('✅ Existing user upgraded to SUPER_ADMIN');
    console.log('   Name:', updated.name);
    console.log('   Email:', updated.email);
    console.log('   Role:', updated.role);
    console.log('   Org:', updated.organization.name);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = 'cogniflow-' + Date.now();

  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        brandName: 'Cogniflow',
        primaryColor: '#0d9488',
        smallestAiApiKey: process.env.SMALLEST_AI_API_KEY || null,
        smallestAiBaseUrl: process.env.SMALLEST_AI_BASE_URL || null,
        plan: 'ENTERPRISE',
        isActive: true,
      },
    });
    return tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        organizationId: org.id,
        role: 'SUPER_ADMIN',
      },
      include: { organization: true },
    });
  });

  console.log('');
  console.log('✅ SUPER_ADMIN account created successfully!');
  console.log('─────────────────────────────────────────');
  console.log('   Name        :', user.name);
  console.log('   Email       :', user.email);
  console.log('   Role        :', user.role);
  console.log('   Organisation:', user.organization.name);
  console.log('   Plan        :', user.organization.plan);
  console.log('─────────────────────────────────────────');
  console.log('👉 Login at http://localhost:3000/login');
  console.log('   Then go to Super Admin in the sidebar');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
