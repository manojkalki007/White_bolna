import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'manojkalki007@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'Cogniflowsuper@2026';
  const name = process.env.SUPER_ADMIN_NAME ?? 'Manoj Kalki';

  console.log(`🔧 Upserting super admin: ${email}`);

  // 1. Ensure the platform-admin org exists
  const org = await prisma.organization.upsert({
    where: { slug: 'platform-admin' },
    update: {},
    create: {
      name: 'VoiceAI Platform',
      slug: 'platform-admin',
      plan: 'ENTERPRISE',
      creditBalance: 99999,
      creditLimit: 99999,
      isActive: true,
    },
  });
  console.log(`✅ Org: ${org.name} (${org.id})`);

  // 2. Upsert Supabase Auth user
  let supabaseUid: string;

  // Check if user exists in Supabase Auth
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingSupabaseUser = existingUsers?.users?.find(u => u.email === email);

  if (existingSupabaseUser) {
    supabaseUid = existingSupabaseUser.id;
    // Update password
    await supabaseAdmin.auth.admin.updateUserById(supabaseUid, { password });
    console.log(`✅ Supabase Auth user updated: ${supabaseUid}`);
  } else {
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'SUPER_ADMIN' },
    });
    if (error || !newUser?.user) {
      throw new Error(`Failed to create Supabase user: ${error?.message}`);
    }
    supabaseUid = newUser.user.id;
    console.log(`✅ Supabase Auth user created: ${supabaseUid}`);
  }

  // 3. Upsert our User DB record, linked to Supabase UID
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      supabaseUid,
      role: 'SUPER_ADMIN',
      name,
      passwordHash: '(supabase-managed)',
    },
    create: {
      email,
      name,
      passwordHash: '(supabase-managed)',
      supabaseUid,
      role: 'SUPER_ADMIN',
      organizationId: org.id,
    },
  });

  console.log('\n✅ Super admin ready!');
  console.log(`   Email       : ${user.email}`);
  console.log(`   Role        : ${user.role}`);
  console.log(`   Org         : ${org.name}`);
  console.log(`   Supabase UID: ${supabaseUid}`);
  console.log(`\n🔑 Login at: http://localhost:3000/login`);
  console.log(`   Email   : ${email}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch(err => { console.error('❌ Error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
