# Cogniflow Voice — AI Telephony SaaS

White-labeled AI Telephony SaaS platform built on [Smallest.ai Atoms](https://smallest.ai).

## Stack
- **Backend**: Node.js · Express · Prisma · PostgreSQL · TypeScript
- **Frontend**: Next.js 16 · Tailwind CSS · React Query
- **AI Layer**: Smallest.ai Atoms (TTS: `waves_lightning_v3_1` · SLM: `electron` · STT built-in)

## Architecture Pipeline
```
User Phone Call → Smallest.ai Telephony Bridge
  → STT (~150ms)  → LLM/electron (~300ms) → TTS/lightning (~120ms)
  → Webhook → Cogniflow Backend (Express/Prisma)
  → Analytics Dashboard (Next.js)
```
End-to-end latency: **~500–800ms** (TTFA)

## Getting Started

### 1. Backend
```bash
cd backend
cp .env.example .env   # fill in your credentials
npm install
npx prisma db push
npm run dev            # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

### 3. Webhooks (live calls)
```bash
ngrok http 4000
# Paste the HTTPS URL into Smallest.ai Dashboard → Webhooks
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SMALLEST_AI_API_KEY` | Your Smallest.ai API key |
| `SMALLEST_AI_BASE_URL` | `https://atoms-api.smallest.ai/api/v1` |
| `JWT_SECRET` | Secret for signing auth tokens |
| `WEBHOOK_SECRET` | HMAC secret for webhook validation |

## Features
- ✅ JWT Authentication + Organization multi-tenancy
- ✅ Campaign management with CSV contact upload
- ✅ Live outbound calling via Smallest.ai
- ✅ Real-time analytics dashboard
- ✅ Knowledge Base management
- ✅ Webhook ingestion + call log tracking
- ✅ Phone number management
- ✅ Agent templates
- ✅ Cogniflow white-label branding


## License
MIT

---

## 📂 What's in the Repo

```
White_cogniflow/
├── backend/                         # Node.js + Express + Prisma
│   ├── src/
│   │   ├── lib/smallestai.ts        # ✅ Fixed API URL + call/agent paths
│   │   ├── routes/agents.ts         # ✅ Fixed /agent (singular)
│   │   ├── routes/kb.ts             # ✅ Fixed /knowledgebase
│   │   ├── routes/auth.ts           # JWT register/login/me
│   │   ├── routes/campaigns.ts      # CSV upload + call launch
│   │   ├── routes/analytics.ts      # Real DB stats
│   │   └── middleware/auth.ts       # JWT guard
│   ├── prisma/schema.prisma         # Full DB schema
│   └── .env.example                 # Safe template (no secrets)
│
├── frontend/                        # Next.js 16 + Tailwind
│   ├── app/
│   │   ├── login/page.tsx           # Auth UI (Sign In / Register)
│   │   ├── analytics/page.tsx       # Live data dashboard
│   │   ├── kb/page.tsx              # Knowledge Base CRUD
│   │   └── campaigns/page.tsx       # Campaign management
│   ├── components/layout/
│   │   ├── Sidebar.tsx              # Cogniflow branding + user footer
│   │   ├── Header.tsx               # Org name + user dropdown
│   │   └── AppShell.tsx             # Auth-aware layout routing
│   └── providers/
│       ├── AuthProvider.tsx         # JWT context (login/register/logout)
│       └── ReactQueryProvider.tsx   # React Query setup
│
├── .gitignore                       # node_modules, .env, dist excluded
└── README.md                        # Full setup docs
```
