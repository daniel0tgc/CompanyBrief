# DEBUG.md — CompanyBrief Debugging Runbook
<!--
  READ THIS FIRST if you are a debugging agent.
  This file is the authoritative diagnostic reference for CompanyBrief.
  Read architecture.md for system context. Read Done.md for current phase state.
  Never modify source files without first completing the relevant runbook below.
  Every runbook ends with a confirmed fix — do not patch blindly.
-->

---

## Ground Rules

1. **Identify the failure class first** — do not attempt a fix until you have matched the symptom to one of the runbooks below.
2. **Read API logs before web logs** — web logs show React/Next.js errors; API logs reveal what actually happened at the data layer.
3. **Confirm the new container is live** before debugging runtime behavior — Railway silently rolls back to old code on a failed deploy. Logs from old and new containers are interleaved in `railway logs` output.
4. **Check env vars before touching code** — the majority of production failures are missing or mismatched environment variables, not code bugs.
5. **One hypothesis at a time** — test one thing, observe the result, then move to the next. Do not batch-fix multiple hypotheses.

---

## Quick Reference: Railway Commands

```bash
# Check deployment status (reliable — use instead of reading logs to confirm deploy)
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $(cat ~/.railway/config.json | python3 -c 'import sys,json;print(json.load(sys.stdin)["user"]["accessToken"])')" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ deployments(input:{serviceId:\"SERVICE_ID\"}){ edges { node { status createdAt } } } }"}' \
  | python3 -m json.tool | grep '"status"' | head -3

# Service IDs
API_SERVICE_ID=be6a309c-e1ab-46f5-9a78-547025fe7884
WEB_SERVICE_ID=cb983020-732c-44f2-8847-5723f9420f66

# Runtime logs (last 50 lines)
railway logs --service api 2>&1 | tail -50
railway logs --service web 2>&1 | tail -50

# Environment variable check
railway variables --service api 2>&1 | grep -i "SECRET\|KEY\|URL"
railway variables --service web 2>&1 | grep -i "SECRET\|KEY\|URL"

# Healthcheck
curl -s https://api-production-7bed.up.railway.app/health
curl -s -o /dev/null -w "%{http_code}" https://web-production-f5f8.up.railway.app/api/healthz
```

---

## Failure Class 1: Browser shows "Application error" / Next.js 500

### Step 1 — Check web service logs for the exact error class and source file
```bash
railway logs --service web 2>&1 | tail -50
```
Look for lines like: `n [ApiError]: Unauthorized at ... /app/(app)/company/[id]/page.js`

### Step 2 — Map the source file to the failure

| Source file in logs | What failed | Go to |
|---|---|---|
| `(app)/company/[id]/page.js` | `getCompany()` threw non-404 | FC2 (401) or FC3 (deploy) |
| `(app)/dashboard/page.js` | `getCompanies()` threw | FC2 (401) |
| `app/page.js` | Landing page server action threw | Check `NEXT_PUBLIC_API_URL` on web service |
| `(app)/layout.js` | Should never throw — has try/catch | Check if layout was modified |

### Step 3 — Check if the API is receiving requests at all
```bash
railway logs --service api 2>&1 | tail -20
```
- **If zero requests appear for a known user action** → token is null → `getRawToken()` cookie lookup failing → go to **FC2**
- **If requests appear** → API is receiving but returning an error → check status code in API logs

---

## Failure Class 2: 401 Unauthorized on all authenticated API calls

**Checklist — run in order, stop at first failure:**

### Check 1 — Is the API receiving requests?
```bash
railway logs --service api 2>&1 | tail -20
```
- **No requests visible** → token is never sent → `getRawToken()` is returning `null`
  - Open browser devtools → Application → Cookies → look for the session cookie
  - NextAuth v5 uses `__Secure-authjs.session-token` (HTTPS) or `authjs.session-token` (HTTP)
  - NextAuth v4 uses `__Secure-next-auth.session-token` / `next-auth.session-token`
  - If cookie exists under a name NOT checked in `getRawToken()`, that is the bug

### Check 2 — Is `NEXTAUTH_SECRET` identical on both services?
```bash
railway variables --service api 2>&1 | grep NEXTAUTH_SECRET
railway variables --service web 2>&1 | grep NEXTAUTH_SECRET
```
Values must be byte-for-byte identical. A mismatch causes `jwtDecrypt` to return null silently.

### Check 3 — Is `AUTH_SECRET` also set on the web service? (NextAuth v5 belt-and-suspenders)
```bash
railway variables --service web 2>&1 | grep AUTH_SECRET
```

### Check 4 — Is `NEXT_PUBLIC_API_URL` set correctly on the web service?
```bash
railway variables --service web 2>&1 | grep API_URL
```
Must be `https://api-production-7bed.up.railway.app` with no trailing slash.

### Check 5 — Is `trustHost: true` set in `apps/web/lib/auth.ts`?
Required for Railway reverse proxy. Without it, NextAuth throws `UntrustedHost` and sessions fail silently.

### Known fix: cookie name mismatch
```ts
// apps/web/lib/api.ts — getRawToken() must check all four variants
const token =
  cookieStore.get("authjs.session-token")?.value ??          // NextAuth v5 HTTP
  cookieStore.get("__Secure-authjs.session-token")?.value ?? // NextAuth v5 HTTPS
  cookieStore.get("next-auth.session-token")?.value ??       // NextAuth v4 HTTP
  cookieStore.get("__Secure-next-auth.session-token")?.value ??
  null;
```

---

## Failure Class 3: Railway deploy shows FAILED

### Step 1 — Confirm it's a build failure vs. a healthcheck failure
```bash
# Build failure: tsc or next build threw an error
# Healthcheck failure: server starts but /api/healthz doesn't return 200

railway logs --service web 2>&1 | grep -E "error|Error|Failed|FAILED|Ready"
```
- If you see `✓ Ready in Xms` followed by FAILED status → healthcheck failure → Step 3
- If you see compile/lint errors before `Ready` → build failure → Step 2

### Step 2 — Build failure
```bash
# For web service — run next build LOCALLY first
cd apps/web && pnpm exec next build 2>&1 | tail -30

# Common causes:
# - ESLint no-unused-vars (tsc --noEmit passes but next build fails)
# - Static generation failure (server component throws during build)
# - Type errors introduced without running tsc
```

### Step 3 — Healthcheck failure
- Healthcheck path must be `/api/healthz` (not `/`)
- Check middleware matcher excludes `/api/*`:
  ```ts
  export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] }
  ```
- Confirm `/api/healthz` route exists at `apps/web/app/api/healthz/route.ts` and returns 200

### Step 4 — Confirm new container is actually serving (not old code)
```bash
# Query Railway API — do NOT rely on logs alone
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ deployments(input:{serviceId:\"WEB_SERVICE_ID\"}){ edges { node { status createdAt } } } }"}'
```
Status must be `SUCCESS`. `FAILED` means Railway is serving old code silently.

---

## Failure Class 4: Analysis job stuck on "pending" / never runs

### Step 1 — Is the BullMQ worker starting?
```bash
railway logs --service api 2>&1 | grep -iE "analysis|worker|bullmq"
```

### Step 2 — Is Redis reachable?
```bash
railway logs --service api 2>&1 | grep -iE "redis|ECONNREFUSED|maxRetries"
```
- `maxRetriesPerRequest` must be `null` in `packages/api/src/lib/redis.ts` — BullMQ requirement

### Step 3 — Are the required API keys set?
```bash
railway variables --service api 2>&1 | grep -E "ANTHROPIC|TAVILY"
```
- Missing `ANTHROPIC_API_KEY` → agent crashes on first Anthropic call
- Missing `TAVILY_API_KEY` → tools return error strings; agent continues with degraded data

### Step 4 — Is `ANALYSIS_CONTEXT.md` in `dist/`?
The API build script copies the file. If the API was deployed before this fix:
```bash
# Check in build logs — look for the cp command output
# Fix: update packages/api/package.json build script to include:
# "build": "tsc && mkdir -p dist/lib/agent && cp src/lib/agent/ANALYSIS_CONTEXT.md dist/lib/agent/"
```

### Step 5 — Is the company status already set to a terminal state?
```bash
# Hit GET /companies/:id directly with a valid token and check company.status
curl -H "Authorization: Bearer TOKEN" https://api-production-7bed.up.railway.app/companies/COMPANY_ID
```
- If `status: "error"` → check `errorMessage` field for the agent failure reason
- If `status: "complete"` → job already ran; the UI should be showing analysis

---

## Failure Class 5: SSE stream not receiving events in browser

### Step 1 — Confirm the EventSource URL and token
Open browser devtools → Network → filter "stream"
- URL should be: `https://api-production-7bed.up.railway.app/companies/[id]/stream?token=<JWE>`
- If `?token=` is missing or empty → `getRawToken()` returned null in server component
- If token is present, test the endpoint directly:
  ```bash
  curl -N "https://api-production-7bed.up.railway.app/companies/COMPANY_ID/stream?token=TOKEN"
  ```
  - 401 → token invalid (re-login and retry)
  - 404 → wrong company ID or not owned by this user
  - Empty stream → company status is not 'running' (may be 'pending' or 'complete')

### Step 2 — Is the BullMQ worker publishing events?
```bash
railway logs --service api 2>&1 | grep -iE "publish|pubsub|analysis:"
```

### Step 3 — Is the SSE subscriber connecting to the right Redis channel?
Channel name pattern: `analysis:[companyId]` — must match exactly between publisher and subscriber.

### Step 4 — Is `X-Accel-Buffering: no` set on the SSE response?
Railway uses nginx. Without this header, nginx buffers SSE events and the browser receives them in batches rather than individually. Check `packages/api/src/routes/companies.ts` stream route.

---

## Failure Class 6: Chat returns 400 "Analysis not ready"

- Company `status` is not `complete`
- Check current status: `GET /companies/:id` → `company.status`
- If `error`: check `company.errorMessage` for why the agent failed
- If `running`: wait for completion before chatting
- If `pending`: BullMQ job hasn't started — see FC4

---

## Failure Class 7: Expansion cards not appearing after chat

### Step 1 — Did the POST /companies/:id/chat succeed?
Check browser Network tab for the response. Should return `{ expansionCard, message }`.

### Step 2 — Is the expansion card in the DB?
```bash
# Hit GET /companies/:id and inspect expansionCards array
curl -H "Authorization: Bearer TOKEN" https://api-production-7bed.up.railway.app/companies/COMPANY_ID | python3 -m json.tool | grep -A5 "expansionCards"
```

### Step 3 — Is the card's `sectionKey` matching a section rendered by AnalysisView?
Valid section keys: `tagline | what_they_do | problem_solved | ai_angle | competitive_position | competitors | customers | market_attractiveness | disruption_risks | future_outlook | bull_case | bear_case | feedback`
If the model returned an invalid key, the card is created but filtered to no section.

---

## Known Gotchas — Quick Reference

| Symptom | Root cause | First command to run |
|---|---|---|
| 401 on all routes, no API log entries | Cookie name: `authjs.*` vs `next-auth.*` | Check browser cookies in devtools |
| 401 on all routes, API log shows inbound | `NEXTAUTH_SECRET` mismatch | `railway variables` on both services |
| Deploy FAILED, server starts in logs | Healthcheck path wrong or middleware blocking `/api/*` | Check `/api/healthz` route + middleware matcher |
| `next build` fails, `tsc --noEmit` passed | ESLint error (unused vars, etc.) | Run `next build` locally |
| Agent always produces placeholder data | `ANALYSIS_CONTEXT.md` missing from `dist/` | Check build script in `packages/api/package.json` |
| SSE connects but no events | Redis pub/sub channel mismatch or worker not publishing | `railway logs --service api` + grep for "publish" |
| Company stuck on "pending" forever | BullMQ worker not starting or Redis unreachable | Check `REDIS_URL` + `maxRetriesPerRequest: null` |
| `jwtDecrypt` returns null | `NEXTAUTH_SECRET` wrong or mismatch | Compare exact byte values on both services |
| Railway shows old code after SUCCESS deploy | Cached container or wrong service targeted | Query Railway API for latest deploy status + timestamp |
| Chat inserts card but UI doesn't update | `onNewCard` callback not wired or `sectionKey` invalid | Check ChatPanel → AnalysisView prop chain |
| Expansion cards missing on page reload | Cards not fetched server-side | Check `GET /companies/:id` includes `expansionCards[]` |

---

## Environment Variable Checklist

Run before every production debug session:

```bash
echo "=== API SERVICE ===" && \
railway variables --service api 2>&1 | grep -E "DATABASE_URL|REDIS_URL|NEXTAUTH_SECRET|ANTHROPIC|TAVILY|APP_URL"

echo "=== WEB SERVICE ===" && \
railway variables --service web 2>&1 | grep -E "NEXTAUTH|AUTH_SECRET|AUTH_TRUST|GOOGLE|API_URL"
```

**Required values:**

| Variable | Service | Expected value |
|---|---|---|
| `NEXTAUTH_SECRET` | api + web | Same 32-byte base64 string on both |
| `AUTH_SECRET` | web | Same value as NEXTAUTH_SECRET |
| `AUTH_TRUST_HOST` | web | `1` |
| `NEXT_PUBLIC_API_URL` | web | `https://api-production-7bed.up.railway.app` |
| `NEXT_PUBLIC_APP_URL` | api | `https://web-production-f5f8.up.railway.app` |
| `ANTHROPIC_API_KEY` | api | `sk-ant-...` |
| `TAVILY_API_KEY` | api | `tvly-...` |
| `DATABASE_URL` | api | Railway internal Postgres URL |
| `REDIS_URL` | api | Railway internal Redis URL |
