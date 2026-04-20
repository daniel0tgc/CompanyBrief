# CompanyBrief

**AI-generated company research briefs, instantly.**

Type a company name. Get a full market research brief — competitive landscape, customer segments, AI angle, bull/bear case, user feedback, and more — powered by Claude and live web search.

🔗 **[Live App → web-production-f5f8.up.railway.app](https://web-production-f5f8.up.railway.app)**

---

## What it does

1. **Search** — type any company name on the landing page
2. **Research** — an AI agent runs 13 parallel research tasks using web search, news search, and URL scraping
3. **Stream** — section cards appear live as each section completes
4. **Chat** — ask follow-up questions; answers appear as expansion cards anchored to the relevant section
5. **Revisit** — all analyzed companies are saved to your sidebar

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + Tailwind CSS + shadcn/ui |
| Backend | Fastify + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Queue / Cache | Redis + BullMQ |
| Auth | NextAuth v5 (Google OAuth) |
| AI | Anthropic `claude-sonnet-4-6` with tool use |
| Web Search | Tavily API |
| Hosting | Railway (two services: `web` + `api`) |

---

## Local Development

### Prerequisites

- Node.js 18+
- pnpm (`corepack enable && corepack prepare pnpm@9 --activate`)
- PostgreSQL running locally
- Redis running locally

### Setup

```bash
git clone https://github.com/daniel0tgc/CompanyBrief.git
cd CompanyBrief
pnpm install
```

Copy environment variable files:

```bash
cp packages/api/.env.example packages/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Fill in the values in both files (see Environment Variables below), then:

```bash
# Run database migrations
cd packages/api && pnpm db:migrate

# Start both services in parallel
cd ../.. && pnpm dev
```

- Next.js: [http://localhost:3000](http://localhost:3000)
- Fastify API: [http://localhost:3001](http://localhost:3001)

---

## Environment Variables

### `packages/api/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_SECRET` | Min 32-char secret — must match web service |
| `ANTHROPIC_API_KEY` | Anthropic API key (`sk-ant-...`) |
| `TAVILY_API_KEY` | Tavily API key (`tvly-...`) |
| `NEXT_PUBLIC_APP_URL` | Web service URL (for CORS) |

### `apps/web/.env.local`

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | This app's URL |
| `NEXTAUTH_SECRET` | Same value as in `packages/api/.env` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_API_URL` | Fastify API URL |

---

## Project Structure

```
companybrief/
├── apps/
│   └── web/                  # Next.js 14 App Router
│       ├── app/
│       │   ├── (auth)/       # Sign-in page
│       │   ├── (app)/        # Authenticated routes (dashboard, company)
│       │   └── api/          # NextAuth + healthcheck routes
│       ├── components/
│       │   ├── analysis/     # SectionCard, AgentThinking, AnalysisView
│       │   ├── chat/         # ChatPanel, ExpansionCard
│       │   └── sidebar/      # Sidebar, CompanyListItem
│       └── lib/              # API client, auth, types, hooks
└── packages/
    └── api/                  # Fastify API
        └── src/
            ├── routes/       # companies, auth, chat
            ├── jobs/         # BullMQ analysis worker
            ├── lib/
            │   ├── agent/    # Anthropic orchestrator + ANALYSIS_CONTEXT.md
            │   ├── tavily.ts # Web search client
            │   └── scraper.ts# Cheerio scraper
            └── db/
                ├── schema.ts
                ├── migrations/
                └── repository/
```

---

## Architecture

See [`architecture.md`](./architecture.md) for the full system diagram including all API routes, authentication flow, SSE streaming pipeline, and communication patterns.
