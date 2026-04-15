# feedback.md — CompanyBrief Post-Mortem
<!--
  PURPOSE: Diagnose every error from Phases 1–3. Prescribe exact improvements to
  Context.md, CursorRules.md, and Done.md so future projects of this pattern
  never hit these issues again.

  Format per error:
  - What happened
  - Root cause (which document was wrong/silent)
  - Exact fix required in each document
-->

---

## Part 1 — Complete Error Catalog

---

### E-01: pnpm not on PATH / corepack not activated
**Phase:** 1 | **Severity:** High — blocked scaffolding entirely

**What happened:** `create-next-app` and `railway up` both failed because `pnpm` was not in the shell PATH. Had to run `corepack enable && corepack prepare pnpm@9.15.0 --activate` before any workspace commands worked.

**Root cause — Context.md:** Task 1.1 says `pnpm-workspace.yaml` should be created but never says "verify pnpm is available." The `packageManager` field in the root `package.json` is not mentioned at all.

**Root cause — CursorRules.md:** No rule about verifying tool availability before executing scaffold commands.

**Fixes:**
- **Context.md Task 1.1:** Add as the first shell command: `npm install -g corepack || true && corepack enable && corepack prepare pnpm@latest --activate`. Add root `package.json` with `"packageManager": "pnpm@9.x"` so corepack auto-activates the correct version.
- **CursorRules.md Section 2:** Add rule: "Before running any monorepo scaffold command, verify pnpm is on PATH: `which pnpm || (corepack enable && corepack prepare pnpm@latest --activate)`"

---

### E-02: `create-next-app` created a nested `.git` inside `apps/web`
**Phase:** 1 | **Severity:** Medium — broke git history for the monorepo

**What happened:** `create-next-app` always runs `git init` in the target directory. This created a nested repo at `apps/web/.git` inside the monorepo root's `.git`, causing the web app to be treated as a git submodule.

**Root cause — Context.md:** Task 1.2 says run `create-next-app` but says nothing about the nested git repo side effect.

**Fixes:**
- **Context.md Task 1.2:** Add immediately after scaffold: `rm -rf apps/web/.git && echo "Removed nested git repo created by create-next-app"`
- **CursorRules.md Section 2:** Add rule: "After any scaffold command (create-next-app, etc.) inside a monorepo, immediately run `find . -name '.git' -not -path './.git' -maxdepth 3 -exec rm -rf {} + 2>/dev/null || true` to remove nested git repos."

---

### E-03: shadcn v4 `@apply outline-ring/50` incompatible with Tailwind v3
**Phase:** 1 | **Severity:** High — broke `next build`

**What happened:** `npx shadcn@latest init` installed shadcn v4 which generates `@apply border-border outline-ring/50` in `globals.css`. Tailwind v3 does not have the `outline-ring` utility, so `next build` failed with a PostCSS syntax error.

**Root cause — Context.md:** Task 1.2 says `npx shadcn@latest init` with no version pin. shadcn v4 is incompatible with Tailwind v3 (which Next.js 14 uses by default).

**Root cause — CursorRules.md:** No rule about pinning CLI tool versions or checking tool/framework compatibility before installing.

**Fixes:**
- **Context.md Task 1.2:** Pin the shadcn command: `npx shadcn@2.x init` OR pin Next.js to one that ships with Tailwind v4 and update the entire stack spec accordingly. Since we use Tailwind v3, write: `npx shadcn@2 init --defaults`. Add an explicit note: "Do NOT use shadcn v4 — it generates Tailwind v4 CSS that is incompatible with Next.js 14's Tailwind v3."
- **Context.md — Tech Stack table:** Add a Shadcn/UI row: `shadcn/ui 2.x` with note "Pin to v2 — v4 requires Tailwind v4."
- **CursorRules.md Section 3 (Never do):** Add: `❌ Run CLI tools with @latest when the plan specifies a framework version — pin the CLI tool version to match the framework.`

---

### E-04: `company_output_example` referenced but never provided
**Phase:** 1 | **Severity:** Medium — seed task was ambiguous

**What happened:** Task 1.5 says "paste the contents of `company_output_example`" but no such file existed anywhere in the repo or the brief. The agent had to construct a full synthetic JSON.

**Root cause — Context.md:** Referenced an external artifact that was not included. The seed data section says `analysis: { /* contents of company_output_example */ }` — a placeholder that is never resolved.

**Fixes:**
- **Context.md Section "Fixture Data":** Replace the comment with the actual complete JSON object for the Vercel example analysis, matching the `CompanyAnalysis` type exactly. If the example is too long, provide a GitHub Gist link or embed it in a separate file listed in the File Structure section. Never leave `/* TODO */` style comments — they become errors.

---

### E-05: Railway CLI v4 `railway add --database postgres` returned Unauthorized
**Phase:** 1 | **Severity:** High — blocked entire database provisioning

**What happened:** Task 1.8 runs `railway add postgresql`. Railway CLI v4 changed this API and the command fails with `Unauthorized` even when logged in. Had to use Railway's GraphQL API directly to provision Postgres and Redis.

**Root cause — Context.md:** Assumed Railway CLI v4 supports `railway add --database postgres` exactly as written. This was true for older CLI versions.

**Root cause — CursorRules.md:** No fallback strategy for when Railway CLI commands fail.

**Fixes:**
- **Context.md Task 1.8:** Replace the `railway add postgresql` and `railway add redis` commands with two alternative approaches:
  ```
  Option A (CLI — if your CLI version supports it):
    railway add --database postgres
    railway add --database redis

  Option B (Dashboard — preferred for new Railway CLI v4+):
    Open https://railway.app/project/[id] and add Postgres + Redis via the
    "New Service → Database" button. Copy DATABASE_URL and REDIS_URL from
    the Variables tab.
  ```
  Add a note: "Railway CLI v4+ does not support `railway add --database`. Use the dashboard or the Railway GraphQL API if CLI fails."
- **CursorRules.md Section 1 (Prime Directive):** Add: "If a CLI infrastructure command fails with auth or unsupported errors after 1 retry, output BLOCKED and list the manual dashboard steps as the fallback."

---

### E-06: Postgres volume `lost+found` conflict / PGDATA misconfiguration
**Phase:** 1 | **Severity:** High — Postgres kept crashing

**What happened:** Railway volumes always create a `lost+found` directory at the mount root. PostgreSQL's `initdb` refuses to initialize in a non-empty directory. The postgres-ssl image also enforces that the volume is mounted at exactly `/var/lib/postgresql/data`. The fix was to set `PGDATA=/var/lib/postgresql/data/pgdata` so `initdb` runs in a subdirectory.

**Root cause — Context.md:** Provides no guidance on Postgres volume configuration when deploying via raw Docker images on Railway.

**Fixes:**
- **Context.md Task 1.8:** Add under Railway Postgres setup:
  ```
  Postgres volume configuration (required for Railway):
  - Volume must be mounted at: /var/lib/postgresql/data
  - Set env var on Postgres service: PGDATA=/var/lib/postgresql/data/pgdata
    (this makes postgres initialize in a subdirectory, avoiding the lost+found conflict)
  ```
- **Done.md template — KNOWN ISSUES section:** Pre-populate: `Railway Postgres: PGDATA must be /var/lib/postgresql/data/pgdata when using volume mount at /var/lib/postgresql/data.`

---

### E-07: DB migration unreachable from local machine
**Phase:** 1 (discovered in Phase 3) | **Severity:** Medium — created hidden gap

**What happened:** `railway run pnpm db:migrate` injected env vars but tried to connect to `postgres.railway.internal` — a hostname only resolvable inside Railway's private network. Migrations never ran until a `preDeployCommand` was set on the API service.

**Root cause — Context.md:** Task 1.8 says to deploy but never mentions running migrations. The migration step was omitted from the Phase 1 acceptance criteria entirely.

**Fixes:**
- **Context.md Task 1.8:** Add as a required step after deploying:
  ```
  # Set preDeployCommand on the API service so migrations run inside Railway's network:
  # Via Railway dashboard → api service → Settings → Deploy → Pre-deploy command:
  pnpm --filter @companybrief/api run db:migrate

  This runs before every deployment and is idempotent (Drizzle journal tracks applied migrations).
  ```
- **Context.md Phase 1 Verification:** Add: `- [ ] DB migration ran successfully (check api service deploy logs for "migrations applied")`
- **Context.md Phase 1 Verification:** Add: `- [ ] DB seed ran: demo user and Vercel company visible in Railway Postgres`

---

### E-08: NextAuth v5 uses JWE (encrypted tokens), not JWS (signed tokens)
**Phase:** 2 | **Severity:** High — required switching from `jsonwebtoken` to `jose`

**What happened:** Context specified `jsonwebtoken` for Fastify JWT verification. NextAuth v5 beta uses JWE (JSON Web Encryption via A256CBC-HS512) by default, not the signed HS256 JWT that `jsonwebtoken` handles. `jsonwebtoken.verify()` cannot decode a JWE.

**Root cause — CursorRules.md Section 4:** States "NextAuth session stored as a signed JWT" — this is accurate for NextAuth v4 but incorrect for v5 beta. NextAuth v5 encrypts the session token.

**Root cause — Context.md Task 2.5:** Says `Install: jsonwebtoken @types/jsonwebtoken` and `Verifies the JWT using NEXTAUTH_SECRET (use jsonwebtoken library)`.

**Fixes:**
- **CursorRules.md Section 4:** Replace: "NextAuth session stored as a signed JWT in an httpOnly cookie" with: "NextAuth v5 session stored as a **JWE-encrypted** token in an httpOnly cookie (`next-auth.session-token`). Use `jose`'s `jwtDecrypt` with a SHA-256-derived key from `NEXTAUTH_SECRET` to verify on the Fastify side — NOT `jsonwebtoken` (which only handles signed JWTs, not encrypted JWEs)."
- **Context.md Task 2.5:** Replace:
  - `Install: jsonwebtoken @types/jsonwebtoken` → `Install: jose fastify-plugin`
  - The description of JWT verification → specify JWE decryption with `jose`:
    ```
    Verifies the JWE token using jose:
    import { jwtDecrypt } from 'jose'
    import { createHash } from 'crypto'
    const key = new Uint8Array(createHash('sha256').update(NEXTAUTH_SECRET).digest())
    const { payload } = await jwtDecrypt(token, key)
    ```
  - Note: `fastify-plugin` is required to expose decorations across plugin scope boundaries.
- **Context.md Task 2.5:** Add note: "Also accept `?token=` query param — EventSource (Phase 5) cannot set headers, so the stream endpoint uses query param auth."

---

### E-09: `auth()` returns Session object, not the raw JWT token
**Phase:** 2 | **Severity:** Medium — required reading cookie directly

**What happened:** Context.md Task 2.8 says "Gets the current NextAuth JWT token server-side via `auth()` call." In NextAuth v5, `auth()` returns a `Session` object (the decoded, decrypted payload) — not the raw encrypted cookie value. To send the raw token to Fastify, the raw cookie must be read from `next/headers`.

**Root cause — Context.md Task 2.8:** Incorrect description of `auth()` return value.

**Fixes:**
- **Context.md Task 2.8:** Replace the `auth()` description with:
  ```
  To get the raw NextAuth token to pass to Fastify as Authorization header:
  import { cookies } from 'next/headers'
  const token = cookies().get('next-auth.session-token')?.value
              ?? cookies().get('__Secure-next-auth.session-token')?.value
  // Pass as: Authorization: Bearer ${token}
  Note: auth() returns the decoded Session object — NOT the raw cookie.
  Use cookies() from 'next/headers' to read the actual JWE token.
  ```

---

### E-10: `trustHost: true` required for NextAuth v5 behind Railway reverse proxy
**Phase:** 2–3 | **Severity:** High — caused UntrustedHost errors in production, 5 failed deploys

**What happened:** NextAuth v5 by default validates the `Host` header against known URLs. Railway terminates SSL at a load balancer and forwards `X-Forwarded-Host`. Without `trustHost: true`, every auth-related request throws `UntrustedHost`. This error appeared as runtime crashes, masking the actual build error (E-17).

**Root cause — Context.md Task 2.1:** The `auth.ts` code example does not include `trustHost: true`.

**Root cause — CursorRules.md Section 4:** No mention of this NextAuth v5 production requirement.

**Fixes:**
- **Context.md Task 2.1:** Add `trustHost: true` to the NextAuth config example:
  ```typescript
  export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [...],
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,     // ← REQUIRED for Railway/Vercel/any reverse proxy
    session: { strategy: 'jwt' },
    ...
  })
  ```
- **Context.md Environment Variables:** Add `AUTH_TRUST_HOST=1` to the `apps/web/.env.local` and Railway web service env vars (belt-and-suspenders for runtime).
- **CursorRules.md Section 4:** Add: "`trustHost: true` MUST be set in the NextAuth config when deploying behind any reverse proxy (Railway, Vercel, Nginx). Without it, all auth routes return UntrustedHost errors."

---

### E-11: Google OAuth redirect URIs not registered before Phase 2 testing
**Phase:** 2 | **Severity:** Medium — blocked functional testing

**What happened:** After deploying, clicking "Sign in with Google" failed with a Google OAuth error because the production callback URL was not yet registered in Google Cloud Console.

**Root cause — Context.md Task 2.4 / Verification:** The verification checklist says "Clicking 'Continue with Google' opens Google consent screen" but never says to register the redirect URIs first.

**Fixes:**
- **Context.md Task 2.1 (or as a new pre-task):** Add as a required prerequisite step:
  ```
  Before deploying Phase 2, register these OAuth redirect URIs in Google Cloud Console
  (https://console.cloud.google.com → APIs & Services → Credentials → your Web Client):
    Authorized redirect URIs:
      http://localhost:3000/api/auth/callback/google
      https://[web-railway-url]/api/auth/callback/google
    Authorized JavaScript origins:
      http://localhost:3000
      https://[web-railway-url]
  Replace [web-railway-url] with the actual Railway web service URL from Phase 1.
  ```

---

### E-12: `.env` file contained secrets in wrong files + leading whitespace in values
**Phase:** 2 (discovered during key setup) | **Severity:** Medium — caused silent auth failures

**What happened:** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` appeared in `packages/api/.env` (API service) when they belong only in `apps/web/.env.local`. `ANTHROPIC_API_KEY` had a leading space (`= sk-ant-...`), making the key invalid.

**Root cause — Done.md template:** No validation step for env var file correctness.

**Root cause — Context.md:** Environment variables section clearly separates them by service but does not include a validation step.

**Fixes:**
- **Context.md Task 1.7:** Add a verification sub-step:
  ```
  Verify env var placement:
  - packages/api/.env: should NOT contain GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL
  - apps/web/.env.local: should NOT contain DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, TAVILY_API_KEY
  - Check for leading/trailing whitespace: grep -n '= ' packages/api/.env apps/web/.env.local
    (any "= value" with a space after = is a bug — values must be flush after the =)
  ```
- **CursorRules.md Section 7 (Done.md Protocol):** Add to phase summary requirements: "Confirm that each env var appears in exactly one service's file, per the Environment Variables section of Context.md."

---

### E-13: DB migration strategy undefined until Phase 3 hit a wall
**Phase:** 1–3 | **Severity:** Medium — created confusion across phases

**What happened:** The DB schema and migration were created in Phase 1 but no phase specified HOW migrations would run in production. This gap was discovered mid-Phase 3 when company routes needed tables to exist.

**Root cause — Context.md:** Phase 1 runs `pnpm db:generate` locally but never addresses running `pnpm db:migrate` against Railway's live database.

**Fixes:**
- **Context.md Phase 1 Task 1.8:** Explicitly add:
  ```
  Set preDeployCommand on Railway api service (via dashboard → Settings → Deploy):
    pnpm --filter @companybrief/api run db:migrate
  
  This runs automatically before every api deploy, applying pending migrations
  idempotently. Drizzle's journal prevents re-running already-applied migrations.
  
  DO NOT try to run db:migrate locally against Railway — postgres.railway.internal
  is only reachable from within Railway's private network.
  ```

---

### E-14: No healthcheck endpoint specified for the Next.js web service
**Phase:** 3 | **Severity:** High — caused 5 failed Railway deploys

**What happened:** Railway's default healthcheck (and what the agent set) was `/`. The auth middleware redirects all unauthenticated requests to `/sign-in` (HTTP 302). Railway considers anything other than 200 as unhealthy → deployment marked FAILED → Railway rolled back to old code silently.

**Root cause — Context.md:** Phase 1 scaffolds Next.js but never adds a healthcheck endpoint. Phase 3 adds auth middleware but never accounts for its effect on Railway's healthcheck. No file structure mention of a healthcheck route.

**Root cause — CursorRules.md:** No rule about Railway healthchecks for authenticated Next.js apps.

**Fixes:**
- **Context.md File Structure:** Add `app/api/healthz/route.ts` to the file tree with comment `# Railway healthcheck — always 200, excluded from auth middleware`
- **Context.md Task 1.3 (or a new Task 1.9):** Add:
  ```
  Create apps/web/app/api/healthz/route.ts:
  export const runtime = "nodejs"
  export async function GET() { return Response.json({ ok: true }) }
  
  Then set Railway web service healthcheck path to /api/healthz
  (the middleware matcher excludes /api/* so this is never auth-gated).
  ```
- **Context.md Task 1.8:** Add to Railway service configuration:
  ```
  Set healthcheck paths:
  - api service: /health  (already returns 200)
  - web service: /api/healthz  (create this endpoint — see above)
  ```
- **CursorRules.md Section 5 (Next.js rules):** Add: "Every Next.js deployment on Railway MUST have a `GET /api/healthz` route that returns `{ ok: true }`. The healthcheck MUST use this path — never `/` or any auth-protected route. The auth middleware matcher must exclude `/api/*`."

---

### E-15: Railway build cache silently served stale code
**Phase:** 3 | **Severity:** Critical — 5 failed deploys went undetected for many cycles

**What happened:** After a build error (`"use server"` bug, E-17), Railway cached the last successful build image. Every subsequent `railway up` uploaded new source code, but because the build failed silently, Railway kept serving Phase 2 code. The CLI `service logs` showed Phase 2 runtime errors, not Phase 3 build errors. The actual build error was only visible via Railway's GraphQL `buildLogs` query.

**Root cause — CursorRules.md:** No rule about verifying that a `railway up` actually deployed NEW code.

**Root cause — Context.md:** No mention of how Railway handles failed builds (rollback to last success).

**Fixes:**
- **CursorRules.md Section 2 (Per-Task Discipline):** Add:
  ```
  After every `railway up`:
  1. Query deployment status via `railway status` or graphql
  2. If status is FAILED, get the SPECIFIC build error: `railway service logs --build`
     or use the buildLogs GraphQL query — do NOT read runtime logs, they show old code
  3. Never assume a deploy succeeded because the service is still responding —
     Railway silently rolls back to the last successful image
  4. If the build failed, FIX THE BUILD ERROR before any other debugging
  5. If the same build fails 3 times, output BLOCKED with the exact error
  ```
- **Context.md Task 1.8 / Railway deploy guidance:** Add:
  ```
  How to verify a deploy actually succeeded:
  - `railway status` should show SUCCESS (not FAILED, BUILDING, or DEPLOYING)
  - Hit an endpoint that ONLY exists in the new code to confirm rollback didn't occur
  - If status is FAILED: run `npx @railway/cli@latest service logs --build` to get the
    actual compiler error — runtime logs may show the OLD code's errors instead
  ```
- **Done.md template — Deploy Status section:** Add required fields:
  ```
  - Latest deployment ID: [from `railway status` JSON]
  - Deployment status: [SUCCESS / FAILED / BUILDING]
  - New-code verification: [URL endpoint that only exists in this phase's code → HTTP 200 ✅]
  ```

---

### E-16: Railway build cache keyed on `package.json` only
**Phase:** 3 | **Severity:** Medium — required manual cache bust

**What happened:** Even when source files (`.ts`, `.tsx`) changed, Railway's Nixpacks reused the cached Docker layer for `next build` if `package.json` hadn't changed. Bumping `package.json` version to `0.3.0` was needed to force a cache invalidation.

**Root cause — Context.md / CursorRules.md:** Neither document mentions Railway's build caching behavior or how to bust it.

**Fixes:**
- **CursorRules.md Section 2:** Add: "If a Railway `railway up` build uses cached assets (build time is suspiciously short, or new routes are missing), bump the `version` field in the relevant `package.json` to force Docker layer cache invalidation. Railway's Nixpacks caches the build layer when it cannot detect source changes."
- **Context.md — Railway deploy guidance:** Add: "If Railway serves stale code despite uploading new source, bump `apps/web/package.json` version and redeploy."

---

### E-17: File-level `"use server"` directive on `page.tsx` broke the build
**Phase:** 3 | **Severity:** High — caused all Phase 3 web deploys to fail silently

**What happened:** A file-level `"use server"` directive was placed at the top of `apps/web/app/page.tsx`. Next.js treats every export from a `"use server"` file as a server action. `LandingPage` is a synchronous React component — server actions must be async. `next build` failed with "Server actions must be async functions."

**Root cause — Context.md Task 3.6:** The instruction says "via server action → redirect to `/company/[id]`" but provides no code pattern. The agent inferred the wrong placement for the `"use server"` directive.

**Root cause — CursorRules.md:** No rule about `"use server"` directive placement.

**Fixes:**
- **Context.md Task 3.6:** Provide the exact server action pattern:
  ```typescript
  // ✅ Correct: "use server" inside the function, not at the file level
  export default function LandingPage() {
    async function submitCompany(formData: FormData) {
      "use server"  // ← INSIDE the function body, not at the file top
      const name = (formData.get("name") as string)?.trim() ?? ""
      if (!name) return
      const company = await createCompany(name)
      redirect(`/company/${company.id}`)
    }
    return <form action={submitCompany}>...</form>
  }
  ```
  Add warning: "NEVER add `"use server"` at the file level in a page.tsx that also exports a React component — this turns the component itself into a server action and breaks the build."
- **CursorRules.md Section 3 (Never do):** Add: `❌ File-level "use server" directive in any file that also exports a React component — use inline "use server" inside the action function only.`
- **CursorRules.md Section 8 (Verification):** Add to the checklist: `- [ ] No file-level "use server" in any file that exports a React component`

---

### E-18: `ioredis` requires named import, not default import
**Phase:** 3 | **Severity:** Low — caught by TypeScript

**What happened:** `import IORedis from 'ioredis'` fails TypeScript strict mode — `ioredis` uses a named export `Redis`. Required `import { Redis as IORedis } from 'ioredis'`. Also: BullMQ requires `maxRetriesPerRequest: null` on the ioredis connection.

**Root cause — Context.md Task 3.3:** The `redis.ts` lib isn't mentioned in the Context at all. The import is left to the agent's interpretation.

**Fixes:**
- **Context.md Task 3.3:** Provide the exact `lib/redis.ts` file content:
  ```typescript
  // packages/api/src/lib/redis.ts
  import { Redis } from 'ioredis'
  export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,  // required by BullMQ
  })
  ```
  Add note: "Use `{ Redis }` named import — ioredis does not have a default export. `maxRetriesPerRequest: null` is required by BullMQ."

---

### E-19: `AUTH_SECRET` vs `NEXTAUTH_SECRET` naming confusion
**Phase:** 2 | **Severity:** Low — caused extra Railway env vars

**What happened:** NextAuth v5 prefers `AUTH_SECRET` and `AUTH_URL` (new naming convention). The project uses `NEXTAUTH_SECRET` (passed via the `secret` config option) and `NEXTAUTH_URL`. Both work, but it creates dual naming (we ended up with both `AUTH_SECRET` and `NEXTAUTH_SECRET` in Railway).

**Root cause — Context.md:** Uses the NextAuth v4 naming convention (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) without acknowledging that v5 prefers `AUTH_SECRET`, `AUTH_URL`.

**Fixes:**
- **Context.md Environment Variables section:** Add a note: "NextAuth v5 prefers `AUTH_SECRET` and `AUTH_URL` over `NEXTAUTH_SECRET`/`NEXTAUTH_URL`. For clarity and forward compatibility, use `AUTH_SECRET` in new projects. In this project, `NEXTAUTH_SECRET` works because it is passed explicitly via the `secret` config option — but also set `AUTH_SECRET` to the same value to satisfy v5 middleware internals."
- **Context.md auth.ts code example:** Change `secret: process.env.NEXTAUTH_SECRET` to `secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`.

---

## Part 2 — Systemic Patterns & Document-Level Improvements

---

### Pattern 1: "Assume the library works as you describe" failures
Three issues (E-08, E-09, E-10) all stem from Context.md describing NextAuth v5's behavior using NextAuth v4 semantics. The planner wrote the plan before the stack was fully proven.

**Fix for Context.md (universal rule for all projects):** For any library that is in a beta/RC version (`next-auth@beta`, etc.), add a dedicated "Known v5 Differences" callout box directly in the relevant phase:
```
⚠️ NextAuth v5 (beta) differs from v4:
- Token format: JWE (encrypted) not JWS (signed) — use jose, not jsonwebtoken
- auth() returns Session, not raw token — use cookies() to read the raw JWE
- Env var names: AUTH_SECRET, AUTH_URL (v4 used NEXTAUTH_SECRET, NEXTAUTH_URL)
- trustHost: true required on any non-localhost host
```

---

### Pattern 2: Infrastructure commands are assumed to work
Five issues (E-05, E-06, E-07, E-13, E-14) relate to infrastructure steps in Phase 1 that had no fallback and no verification. The agent trusted CLI tool docs that were outdated.

**Fix for Context.md (universal rule for infrastructure phases):** Every infrastructure task must include:
1. A "verify it worked" command immediately following the task
2. A "if this fails" fallback (dashboard URL, GraphQL alternative, etc.)
3. A required artifact to prove it worked (a URL that returns expected JSON)

---

### Pattern 3: Build errors masked by Railway rollback
Issue E-15 cost 5 failed deploys because Railway silently rolled back and showed the old service's runtime logs instead of the new build's compiler error. The agent was debugging runtime symptoms of Phase 2 code when the actual error was a Phase 3 build failure.

**Fix for CursorRules.md:** Add a mandatory "deploy verification" step template:
```
After every railway up:
□ Check deployment status (SUCCESS / FAILED)
□ If FAILED: get build logs, not runtime logs
□ Verify new code is live by hitting an endpoint unique to this phase
□ If same build fails 3× → BLOCKED (do not keep redeploying the same error)
```

---

### Pattern 4: Next.js App Router subtleties not covered
Issues E-14 (`/` healthcheck redirect), E-17 (file-level `"use server"`), and several near-misses show that App Router has specific behaviors that the agent can't predict without explicit rules.

**Fix for CursorRules.md Section 5 (Next.js rules):** Add a "Next.js App Router gotchas" subsection:
```
App Router Gotchas:
- File-level "use server" marks ALL exports as server actions. Use inline "use server"
  inside action functions only when the file also exports a React component.
- Server actions must be async. Synchronous functions in "use server" context fail build.
- The middleware matcher pattern /((?!api|...)) excludes /api/* routes. Always add
  /api/healthz as a Railway healthcheck endpoint — never use / or an auth-protected route.
- process.env in Edge middleware (middleware.ts) only reliably sees variables set at
  BUILD TIME. For runtime env vars that need to reach middleware, use next.config.mjs env{}.
- auth() from NextAuth returns Session (decoded), not the raw cookie token.
  Use cookies().get('next-auth.session-token') to pass the raw JWE to external APIs.
```

---

### Pattern 5: The Done.md `Required Keys` table was never maintained
The `Required Keys` table in Done.md lists every env var with a Railway ✅/⬜ status column, but by Phase 3 completion those checkboxes had never been filled in. The table became stale fiction rather than ground truth.

**Fix for Done.md template:** Change the Required Keys table to a mandatory-update section. Add to CursorRules.md Section 7:
```
After every phase that adds or confirms Railway env vars:
- Update the Required Keys table ✅/⬜ column immediately
- ⬜ = not yet set in Railway
- ✅ = confirmed set in Railway and verified working
This table is referenced during Phase 9 hardening — it must be accurate.
```

---

### Pattern 6: Verification checklists existed but were not blocking
CursorRules.md Section 8 has a good verification checklist. But none of the phase verifications in Context.md said "run the Section 8 checklist." The agent ran `tsc --noEmit` consistently but other items (Zod on all routes, CORS on new routes) were never consistently applied.

**Fix for CursorRules.md Section 8:** Make it explicitly blocking:
```
BLOCKING RULE: You may NOT check off a phase task in Done.md until ALL applicable items
in this checklist pass. "Applicable" means relevant to the files changed by that task.
If an item cannot pass (e.g., no new routes = Zod check N/A), write "N/A: [reason]" 
next to it in the task's Done.md entry.
```

---

## Part 3 — Proposed Section Additions by Document

---

### Additions to `CursorRules.md`

**New Section 9: Railway-Specific Rules**
```markdown
## 9. Railway-Specific Rules

### Deployment
- Always use `/api/healthz` as the healthcheck path for Next.js services — never `/`
- After every `railway up`, verify deployment status is SUCCESS before proceeding
- If deployment status is FAILED, read BUILD logs (not runtime logs) to find the error
- Railway rolls back to the last successful image on failure — runtime logs show OLD code
- If build cache is suspected stale, bump `package.json` version to force invalidation
- `railway add --database` may not work in CLI v4+ — use Railway dashboard as fallback

### Databases
- Railway Postgres volumes: set `PGDATA=/var/lib/postgresql/data/pgdata`
  to avoid `lost+found` conflict at volume mount root
- Never run `db:migrate` locally against Railway — internal hostnames not reachable
  Set `preDeployCommand` on the API service instead (idempotent via Drizzle journal)

### Environment Variables
- Set env vars via Railway dashboard or GraphQL API — verify they appear in
  `railway variables` output BEFORE deploying
- Check for leading/trailing whitespace in values: `grep '= ' .env` catches `KEY= value`
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET belong in the web service ONLY
- NEXTAUTH_SECRET / AUTH_SECRET must be identical in both api and web services
```

**New addition to Section 3 (Never do):**
```
❌ File-level "use server" in a file that also exports a React component
❌ Using @latest for CLI tools when the plan pins a specific framework version
❌ Assuming a railway up deployed new code without verifying deployment status
❌ Reading runtime logs to debug a build failure — build logs are separate
```

**New addition to Section 4 (Auth Rules):**
```
NextAuth v5 (beta) specific:
- trustHost: true MUST be in the NextAuth config for ANY non-localhost deployment
- Session token is JWE (encrypted) — use jose jwtDecrypt, NOT jsonwebtoken
- auth() returns Session object — NOT the raw JWE cookie
- Raw token: cookies().get('next-auth.session-token')?.value
- Env vars: AUTH_SECRET and AUTH_URL preferred over NEXTAUTH_SECRET / NEXTAUTH_URL
- Register Google OAuth redirect URIs BEFORE testing the OAuth flow
```

---

### Additions to `Context.md`

1. **Tech stack table:** Add row for `shadcn/ui 2.x` with "Pin to v2 — v4 requires Tailwind v4."
2. **Task 1.1:** Add corepack activation as the first step.
3. **Task 1.2:** Add `rm -rf apps/web/.git` immediately after scaffold.
4. **Task 1.2:** Pin shadcn: `npx shadcn@2 init --defaults`.
5. **Task 1.3:** Add `/api/healthz` to the file structure and as a required step.
6. **Task 1.5:** Replace `/* contents of company_output_example */` with actual full JSON.
7. **Task 1.8:** Replace `railway add postgresql/redis` with dashboard-first approach + fallback.
8. **Task 1.8:** Add `PGDATA` volume fix for Postgres.
9. **Task 1.8:** Add `preDeployCommand: pnpm db:migrate` setup.
10. **Task 1.8:** Set Railway healthcheck paths for both services.
11. **Task 1.8:** Add deploy verification step (check status, hit unique endpoint).
12. **Task 2.1:** Add `trustHost: true` to the NextAuth config code block.
13. **Task 2.1:** Add a `⚠️ NextAuth v5 differences` callout box.
14. **Task 2.1 (pre-task):** Add Google Console redirect URI registration as prerequisite.
15. **Task 2.5:** Replace `jsonwebtoken` with `jose` + `jwtDecrypt`. Add `fastify-plugin` to install.
16. **Task 2.8:** Replace `auth()` description with `cookies()` pattern.
17. **Task 3.3:** Provide exact `lib/redis.ts` with named `{ Redis }` import and `maxRetriesPerRequest: null`.
18. **Task 3.6:** Provide the correct inline `"use server"` pattern with explicit warning.
19. **Environment Variables section:** Add `AUTH_SECRET`, `AUTH_TRUST_HOST=1` to web service vars.
20. **Phase 1 Verification:** Add DB migration, DB seed, and deploy verification checks.

---

### Additions to `Done.md` template

1. **Required Keys table:** Add "verified working end-to-end" column (separate from "set in Railway").
2. **Deploy Status section:** Add "deployment ID", "build logs checked", "new-code endpoint verified."
3. **Codebase State Graph:** Add `Railway services status` block showing health of each deployed service.
4. **Each Phase's "Issues Encountered":** Add sub-header "Build Issues" (compile-time) separate from "Deploy Issues" (runtime) — they require different debugging paths.

---

## Part 4 — Priority Order for Fixes

| Priority | Issue | Impact |
|---|---|---|
| 🔴 Critical | E-10, E-17 + Platform section | Prevented production deploys for hours |
| 🔴 Critical | E-14 + healthcheck spec | 5 failed deploys |
| 🔴 Critical | E-15 + build verification rule | Masked actual errors, caused debug loops |
| 🟠 High | E-08 + jose spec | Wrong library specified |
| 🟠 High | E-05 + Railway CLI fallback | Blocked infrastructure setup |
| 🟠 High | E-07 + migration strategy | Undefined production DB migration plan |
| 🟡 Medium | E-02, E-03, E-04 | Scaffolding friction |
| 🟡 Medium | E-09, E-11, E-12 | Auth integration nuances |
| 🟢 Low | E-01, E-06, E-18, E-19 | One-time environmental issues |
