# CompanyBrief — Architecture Graph

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                        │
│                                                                             │
│  ┌──────────────┐   ┌──────────────────────────────────────────────────┐   │
│  │  /sign-in    │   │  /(app)/* (all authenticated pages)              │   │
│  │              │   │                                                  │   │
│  │  Google      │   │  ┌──────────────┐  ┌───────────────────────┐   │   │
│  │  Sign-In     │   │  │  /dashboard  │  │  /company/[id]        │   │   │
│  │  button      │   │  │              │  │                        │   │   │
│  │              │   │  │  Company     │  │  ┌─────────────────┐  │   │   │
│  │  → Google    │   │  │  grid cards  │  │  │ AgentThinking   │  │   │   │
│  │    OAuth     │   │  │              │  │  │ (collapsible)   │  │   │   │
│  └──────────────┘   │  └──────────────┘  │  ├─────────────────┤  │   │   │
│                     │                    │  │ 13× SectionCard │  │   │   │
│  /                  │  ┌──────────────┐  │  │ (grid lg:col-2) │  │   │   │
│  ┌──────────────┐   │  │   Sidebar    │  │  ├─────────────────┤  │   │   │
│  │  Landing     │   │  │  Company     │  │  │ ExpansionCards  │  │   │   │
│  │  search form │   │  │  list +      │  │  │ per section     │  │   │   │
│  │              │   │  │  status      │  │  ├─────────────────┤  │   │   │
│  │  Server      │   │  │  badges      │  │  │ ChatPanel       │  │   │   │
│  │  Action ──►  │   │  └──────────────┘  │  │ (sticky bottom) │  │   │   │
│  └──────────────┘   │                    │  └─────────────────┘  │   │   │
│                     └──────────────────────────────────────────────┘   │   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                         │
          │ Server Actions      │ Server Components        │ Client Components
          ▼                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS SERVER (Railway: web)                       │
│                                                                             │
│  ROUTES                           MIDDLEWARE                                │
│  GET  /                           middleware.ts ──► protects /(app)/*      │
│  GET  /(app)/dashboard            ↑                                         │
│  GET  /(app)/company/[id]         NextAuth v5 session check                │
│  GET  /sign-in                                                              │
│  GET  /api/auth/[...nextauth]     ← Google OAuth handler                   │
│  GET  /api/healthz                → { ok: true }  (no auth)                │
│                                                                             │
│  SERVER ACTIONS (lib/actions.ts)                                            │
│  sendChatMessage(companyId, q) ──► reads httpOnly cookie ──► Fastify      │
│                                                                             │
│  DATA FLOW (server components)                                              │
│  page.tsx ──► getRawToken() ──► reads __Secure-authjs.session-token        │
│            ──► apiClient(path) ──► Authorization: Bearer <JWE>             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTP  (NEXT_PUBLIC_API_URL)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASTIFY API (Railway: api)                           │
│                                                                             │
│  AUTH PLUGIN (verifyNextAuthToken)                                          │
│  Authorization: Bearer <JWE>  ──► jose jwtDecrypt(SHA-256(NEXTAUTH_SECRET))│
│  ?token=<JWE>                 ──► same (for EventSource/SSE)               │
│                               ──► findOrCreate user in DB                  │
│                               ──► req.user = { id, email }                 │
│                                                                             │
│  ROUTES                                                                     │
│  GET  /health                     → { status, timestamp }  (no auth)       │
│  GET  /auth/me                    → { id, email, displayName, avatarUrl }  │
│  GET  /companies                  → { companies: CompanyListItem[] }       │
│  POST /companies                  → 201 { company } + queue BullMQ job     │
│  GET  /companies/:id              → { company, expansionCards[] }          │
│  DELETE /companies/:id            → 204                                    │
│  GET  /companies/:id/stream       → SSE text/event-stream (?token= auth)  │
│  POST /companies/:id/chat         → { expansionCard, message }             │
└──────────────────┬─────────────────────┬──────────────────┬────────────────┘
                   │                     │                  │
          ┌────────┘              ┌──────┘          ┌──────┘
          ▼                      ▼                  ▼
┌──────────────────┐   ┌──────────────────┐  ┌──────────────────────────────┐
│   PostgreSQL     │   │   Redis          │  │  EXTERNAL APIs               │
│   (Railway)      │   │   (Railway)      │  │                              │
│                  │   │                  │  │  Anthropic claude-sonnet-4-6 │
│  users           │   │  BullMQ queue    │  │  ├─ Analysis agent (13 sec.) │
│  companies       │   │  'analysis'      │  │  └─ Chat Q&A (1 turn)        │
│  conversations   │   │  ┌──────────┐   │  │                              │
│  expansion_cards │   │  │  Worker  │   │  │  Tavily API                  │
│                  │   │  │ (in-proc)│   │  │  ├─ web_search               │
│  Drizzle ORM     │   │  └──────────┘   │  │  ├─ search_news              │
│  Migrations via  │   │                  │  │  └─ extract (URL)            │
│  preDeployCmd    │   │  Pub/Sub         │  │                              │
│                  │   │  analysis:[id]   │  │  Cheerio (scraper)           │
└──────────────────┘   │  ├─ publisher   │  │  └─ Falls back to Tavily     │
                       │  └─ subscriber  │  │     extract on failure        │
                       └────────┬─────────┘  └──────────────────────────────┘
                                │
                    ┌───────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SSE STREAMING FLOW                                      │
│                                                                             │
│  BullMQ Worker ──► publishAgentEvent(companyId, event)                     │
│                          │                                                  │
│                          ▼  Redis pub channel: analysis:[companyId]        │
│                    subscribeToAnalysis()                                    │
│                          │                                                  │
│                          ▼                                                  │
│  GET /companies/:id/stream ──► reply.hijack() ──► raw.write(SSE event)    │
│                          │                                                  │
│                          ▼                                                  │
│  Browser EventSource ──► useAnalysisStream hook                            │
│    events: thinking | tool_call | tool_result | section_complete | replay  │
│    ──► AgentThinking panel (thinking entries)                               │
│    ──► AnalysisView sections (section_complete merges into state)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Communication Patterns

| Flow | Transport | Auth |
|---|---|---|
| Browser → Next.js page | HTTP | NextAuth session cookie |
| Next.js server → Fastify | HTTP fetch | `Authorization: Bearer <JWE>` |
| Browser → Fastify (SSE) | EventSource | `?token=<JWE>` query param |
| Next.js server action → Fastify | HTTP fetch | same as server → Fastify |
| Fastify → Anthropic | HTTPS | `ANTHROPIC_API_KEY` |
| Fastify → Tavily | HTTPS | `TAVILY_API_KEY` |
| BullMQ Worker → Redis | ioredis | `REDIS_URL` |
| SSE route → Redis | ioredis (subscriber) | `REDIS_URL` |

---

## Environment Variables

| Variable | Service | Purpose |
|---|---|---|
| `DATABASE_URL` | api | PostgreSQL connection |
| `REDIS_URL` | api | Redis (BullMQ + pub/sub) |
| `NEXTAUTH_SECRET` | api + web | JWE token signing — must match on both |
| `ANTHROPIC_API_KEY` | api | Analysis agent + chat |
| `TAVILY_API_KEY` | api | Web search / news / extract |
| `NEXT_PUBLIC_APP_URL` | api | CORS origin allowlist |
| `NEXTAUTH_URL` | web | NextAuth base URL |
| `AUTH_SECRET` | web | NextAuth v5 alias for NEXTAUTH_SECRET |
| `AUTH_TRUST_HOST` | web | Required for Railway reverse proxy (`1`) |
| `GOOGLE_CLIENT_ID` | web | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | web | Google OAuth |
| `NEXT_PUBLIC_API_URL` | web | Fastify base URL (used by server + client) |

---

## Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Auth token format | JWE (encrypted) | NextAuth v5 default — requires `jose`, not `jsonwebtoken` |
| Session token forwarding | Read raw cookie → `Authorization: Bearer` | `auth()` returns Session object, not the raw token |
| SSE auth | `?token=` query param | `EventSource` API cannot set headers |
| Background jobs | BullMQ + Redis | Long-running agent calls must not block route handlers |
| SSE bridge | Redis pub/sub | Decouples BullMQ worker from HTTP response lifecycle |
| AI calls (analysis) | BullMQ worker only | 60–120s execution time — cannot be in a request handler |
| AI calls (chat) | Inline in route handler | Single fast Q&A turn — acceptable latency |
| DB access | Drizzle repository layer | No raw SQL in routes; typed access only |
| Client-side data fetching | Server actions + react-query | Client components cannot read httpOnly cookies |
| Migrations | `preDeployCommand` on api service | `postgres.railway.internal` only reachable inside Railway |
