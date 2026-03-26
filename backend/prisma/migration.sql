-- ═══════════════════════════════════════════════════════════════════════════
-- Cogniflow — Voice AI Platform   
-- Full Database Migration for Supabase
-- 
-- HOW TO RUN:
--   1. Go to: https://supabase.com/dashboard/project/cbpzsvzfoquowbldtsrh/sql/new
--   2. Paste this entire script
--   3. Click "Run" (▶)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');
CREATE TYPE "OrgPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "CrmType" AS ENUM ('HUBSPOT', 'SALESFORCE', 'NONE');
CREATE TYPE "CampaignStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'FAILED');
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'INITIATED', 'RINGING', 'IN_CALL', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY');
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- ── Organization ──────────────────────────────────────────────────────────────

CREATE TABLE "Organization" (
  "id"                   TEXT NOT NULL PRIMARY KEY,
  "name"                 TEXT NOT NULL,
  "slug"                 TEXT NOT NULL UNIQUE,
  "bolnaApiKey"          TEXT,
  "bolnaBaseUrl"         TEXT,
  "creditBalance"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "creditUsed"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "creditLimit"          DOUBLE PRECISION NOT NULL DEFAULT 500,
  "stripeCustomerId"     TEXT UNIQUE,
  "stripeSubscriptionId" TEXT,
  "plan"                 "OrgPlan" NOT NULL DEFAULT 'STARTER',
  "isActive"             BOOLEAN NOT NULL DEFAULT true,
  "crmType"              "CrmType",
  "crmAccessToken"       TEXT,
  "crmRefreshToken"      TEXT,
  "crmInstanceUrl"       TEXT,
  "logoUrl"              TEXT,
  "primaryColor"         TEXT DEFAULT '#6366f1',
  "brandName"            TEXT,
  "customDomain"         TEXT UNIQUE,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User ─────────────────────────────────────────────────────────────────────

CREATE TABLE "User" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "email"          TEXT NOT NULL UNIQUE,
  "name"           TEXT NOT NULL,
  "passwordHash"   TEXT NOT NULL DEFAULT '(supabase-managed)',
  "supabaseUid"    TEXT UNIQUE,
  "role"           "Role" NOT NULL DEFAULT 'ADMIN',
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_supabaseUid_idx" ON "User"("supabaseUid");

-- ── StorageFile ───────────────────────────────────────────────────────────────

CREATE TABLE "StorageFile" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "bucket"         TEXT NOT NULL,
  "path"           TEXT NOT NULL,
  "publicUrl"      TEXT,
  "mimeType"       TEXT,
  "sizeBytes"      INTEGER,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "StorageFile_organizationId_idx" ON "StorageFile"("organizationId");
CREATE INDEX "StorageFile_bucket_idx" ON "StorageFile"("bucket");

-- ── BolnaAgent ────────────────────────────────────────────────────────────────

CREATE TABLE "BolnaAgent" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "organizationId"        TEXT NOT NULL REFERENCES "Organization"("id"),
  "bolnaAgentId"          TEXT NOT NULL UNIQUE,
  "name"                  TEXT NOT NULL,
  "status"                "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
  "llmModel"              TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "llmProvider"           TEXT NOT NULL DEFAULT 'openai',
  "systemPrompt"          TEXT NOT NULL,
  "temperature"           DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "voiceId"               TEXT NOT NULL DEFAULT 'ritu',
  "voiceProvider"         TEXT NOT NULL DEFAULT 'bolna',
  "language"              TEXT NOT NULL DEFAULT 'en',
  "fromNumber"            TEXT,
  "ambientNoiseDetection" BOOLEAN NOT NULL DEFAULT true,
  "interruptionThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "bufferingDelay"        INTEGER NOT NULL DEFAULT 100,
  "welcomeMessage"        TEXT,
  "rawConfig"             JSONB,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "BolnaAgent_organizationId_idx" ON "BolnaAgent"("organizationId");
CREATE INDEX "BolnaAgent_status_idx" ON "BolnaAgent"("status");

-- ── Contact ───────────────────────────────────────────────────────────────────

CREATE TABLE "Contact" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
  "phoneNumber"    TEXT NOT NULL,
  "name"           TEXT,
  "email"          TEXT,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("organizationId", "phoneNumber")
);
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");
CREATE INDEX "Contact_phoneNumber_idx" ON "Contact"("phoneNumber");

-- ── Campaign ──────────────────────────────────────────────────────────────────

CREATE TABLE "Campaign" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "organizationId"  TEXT NOT NULL REFERENCES "Organization"("id"),
  "createdById"     TEXT NOT NULL REFERENCES "User"("id"),
  "name"            TEXT NOT NULL,
  "bolnaAgentId"    TEXT NOT NULL REFERENCES "BolnaAgent"("id"),
  "status"          "CampaignStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledStart"  TIMESTAMPTZ,
  "scheduledEnd"    TIMESTAMPTZ,
  "activeHoursFrom" TEXT,
  "activeHoursTo"   TEXT,
  "timeZone"        TEXT NOT NULL DEFAULT 'UTC',
  "creditDeducted"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalContacts"   INTEGER NOT NULL DEFAULT 0,
  "processedCount"  INTEGER NOT NULL DEFAULT 0,
  "failedCount"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_bolnaAgentId_idx" ON "Campaign"("bolnaAgentId");

-- ── CallLog ───────────────────────────────────────────────────────────────────

CREATE TABLE "CallLog" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "campaignId"         TEXT NOT NULL REFERENCES "Campaign"("id"),
  "contactId"          TEXT NOT NULL REFERENCES "Contact"("id"),
  "agentId"            TEXT REFERENCES "BolnaAgent"("id"),
  "bolnaCallId"        TEXT UNIQUE,
  "status"             "CallStatus" NOT NULL DEFAULT 'PENDING',
  "direction"          TEXT NOT NULL DEFAULT 'outbound',
  "duration"           INTEGER,
  "transcript"         TEXT,
  "recordingUrl"       TEXT,
  "bolnaRecordingUrl"  TEXT,
  "storageFileId"      TEXT,
  "disconnectReason"   TEXT,
  "avgLatencyMs"       INTEGER,
  "p95LatencyMs"       INTEGER,
  "postCallMetrics"    JSONB,
  "rawWebhookPayload"  JSONB,
  "creditCost"         DOUBLE PRECISION,
  "startedAt"          TIMESTAMPTZ,
  "endedAt"            TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "CallLog_campaignId_idx" ON "CallLog"("campaignId");
CREATE INDEX "CallLog_contactId_idx" ON "CallLog"("contactId");
CREATE INDEX "CallLog_bolnaCallId_idx" ON "CallLog"("bolnaCallId");
CREATE INDEX "CallLog_agentId_idx" ON "CallLog"("agentId");
CREATE INDEX "CallLog_status_idx" ON "CallLog"("status");
CREATE INDEX "CallLog_createdAt_idx" ON "CallLog"("createdAt");

-- ── WebhookEvent ──────────────────────────────────────────────────────────────

CREATE TABLE "WebhookEvent" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "source"      TEXT NOT NULL DEFAULT 'bolna',
  "eventType"   TEXT NOT NULL,
  "bolnaCallId" TEXT,
  "payload"     JSONB NOT NULL,
  "processed"   BOOLEAN NOT NULL DEFAULT false,
  "error"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "WebhookEvent_bolnaCallId_idx" ON "WebhookEvent"("bolnaCallId");
CREATE INDEX "WebhookEvent_processed_idx" ON "WebhookEvent"("processed");
CREATE INDEX "WebhookEvent_source_eventType_idx" ON "WebhookEvent"("source", "eventType");

-- ── Auto-update updatedAt trigger ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON "Organization" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_updated_at         BEFORE UPDATE ON "User"         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_updated_at        BEFORE UPDATE ON "BolnaAgent"   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_updated_at      BEFORE UPDATE ON "Contact"      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_updated_at     BEFORE UPDATE ON "Campaign"     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calllog_updated_at      BEFORE UPDATE ON "CallLog"      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed: Platform Admin Org ──────────────────────────────────────────────────
-- NOTE: Run this AFTER creating the Supabase Auth user via the Admin seed script
--       OR manually set the supabaseUid to match auth.users.id

INSERT INTO "Organization" ("id", "name", "slug", "plan", "creditBalance", "creditLimit", "isActive")
VALUES (
  'platform-admin-org-001',
  'VoiceAI Platform',
  'platform-admin',
  'ENTERPRISE',
  99999,
  99999,
  true
)
ON CONFLICT ("slug") DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ DONE — All tables created.
-- 
-- NEXT STEPS:
-- 1. After running this SQL, go to your terminal and run:
--    cd backend && npx ts-node -r dotenv/config scripts/upsert-admin.ts
--    (This creates the Supabase Auth user + links it to User table)
--
-- 2. Fill in the DB password in backend/.env:
--    DATABASE_URL and DIRECT_URL (from Supabase → Settings → Database)
--
-- 3. Run the backend: npm run dev
-- 4. Run the frontend: cd ../frontend && npm run dev -- --port 3000
-- ══════════════════════════════════════════════════════════════════════════════
