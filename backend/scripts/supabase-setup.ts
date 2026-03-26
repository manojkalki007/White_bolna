import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = 'https://cbpzsvzfoquowbldtsrh.supabase.co';
const svc = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicHpzdnpmb3F1b3dibGR0c3JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUwMzA1OCwiZXhwIjoyMDkwMDc5MDU4fQ.mi0tFxOrbHYEYBC4yfu5-kJFF3ZJ9nlYk18wKZA2RJ4';

const admin = createClient(url, svc, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('\n🔍 Checking Supabase project connection...\n');

  // 1. Verify auth admin works  
  const { data: users, error: ue } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 });
  if (ue) {
    console.error('❌ Auth error:', ue.message);
  } else {
    console.log(`✅ Auth admin connected. Existing users: ${users.users.length}`);
    users.users.forEach(u => console.log(`   - ${u.email} (${u.id})`));
  }

  // 2. Check existing storage buckets
  const { data: buckets, error: be } = await admin.storage.listBuckets();
  if (be) {
    console.error('❌ Storage error:', be.message);
  } else {
    console.log(`\n✅ Storage buckets: ${buckets.length > 0 ? buckets.map(b => b.name).join(', ') : 'none yet'}`);
  }

  // 3. Create buckets if missing
  const needed = [
    { name: 'recordings', public: true },
    { name: 'kb-documents', public: false },
  ];

  for (const bucket of needed) {
    const exists = buckets?.find(b => b.name === bucket.name);
    if (exists) {
      console.log(`   ℹ️  Bucket "${bucket.name}" already exists`);
      continue;
    }
    const { error: ce } = await admin.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 52428800, // 50MB
    });
    if (ce) {
      console.error(`   ❌ Failed to create "${bucket.name}":`, ce.message);
    } else {
      console.log(`   ✅ Created bucket "${bucket.name}" (public=${bucket.public})`);
    }
  }

  // 4. Construct anon key from DB (via SQL via REST)
  // The anon key is just a JWT with role=anon signed with same secret
  // We can get it by checking the inbuilt supabase config function
  console.log('\n📋 Project Info:');
  console.log(`   URL:              ${url}`);
  console.log(`   Service Role Key: ${svc.substring(0, 40)}...`);
  console.log(`   Project Ref:      cbpzsvzfoquowbldtsrh`);
  console.log('\n⚠️  To get your ANON key:');
  console.log('   → https://supabase.com/dashboard/project/cbpzsvzfoquowbldtsrh/settings/api');
  console.log('   → Copy the "anon public" key\n');

  // 5. Write what we know to env
  const envPath = path.join(process.cwd(), '.env');
  let env = fs.readFileSync(envPath, 'utf8');
  
  env = env.replace(
    'SUPABASE_URL=https://your-project-ref.supabase.co',
    `SUPABASE_URL=${url}`
  );
  env = env.replace(
    'SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here',
    `SUPABASE_SERVICE_ROLE_KEY=${svc}`
  );

  fs.writeFileSync(envPath, env);
  console.log('✅ backend/.env updated with SUPABASE_URL and SERVICE_ROLE_KEY');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
