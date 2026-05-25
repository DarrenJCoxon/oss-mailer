# Work Unit 015 — Settings page

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-014 — Navigation shell](014-nav-shell-first-run.md), [WU-010 — Config Health Check UI](done/010-config-health-check-ui.md)

## What's done when this ships

A developer who has just deployed oss-mailer opens `/settings` and sees exactly which environment variables are set, which are missing, what each one does, and where to set them (Vercel dashboard → Settings → Environment Variables). No curl. No Bearer token. No manual config inspection. The page is read-only — it does not write env vars — but it gives enough context that a non-expert can configure the service without reading the README.

## Walkthrough

1. Developer opens `/settings` after a fresh deploy.
2. Sees three sections: **Provider configuration**, **API security**, **Queue configuration**.
3. Each section lists the relevant env vars. Each var has: name (monospace), current status (✅ Set / ❌ Missing), a one-line description of what it does.
4. Missing vars are highlighted — name in red, ❌ badge, description includes the exact value format (e.g. "Your AWS Access Key ID — format: `AKIA...`").
5. At the top: a summary card — "X of 13 variables configured. Y missing." with a progress indicator.
6. Below the var table: a "How to set these" section — step-by-step instructions specific to Vercel (Settings → Environment Variables → Add), Railway, and plain `.env.local` for local dev.
7. No auth required — the page is accessible without a Bearer token (unlike `/health`). The page shows only var names and set/missing status — never values.

**What if something goes wrong:**
- Any read failure: page still renders, shows "Could not read configuration" for that section.

## How we'll know it's done

1. `GET /settings` renders without auth.
2. All 13 `REQUIRED_ENV_VARS` appear grouped into logical sections.
3. Each var shows ✅ (set) or ❌ (missing) based on actual `process.env`.
4. Var values are never shown — only set/missing status.
5. Summary card shows correct count of set vs. missing.
6. "How to set these" section includes Vercel-specific and `.env.local` instructions.
7. Page is a Server Component — no client JS for the status check.
8. `npx vitest run` exits 0.

## Notes / log

### 2026-05-25 — initial filing

Filed as WU-015. The `/health` endpoint (WU-010) already exists and is the machine-readable version of this page. `/settings` is the human-readable, onboarding-focused version. They share the same underlying data (`REQUIRED_ENV_VARS` + `process.env`) but different rendering goals: `/health` is for curl/monitoring, `/settings` is for first-time setup.

#### Env var groupings for the settings page

**Provider configuration** (who sends what):
- `MAGIC_LINK_PROVIDER` — Which provider handles magic link / transactional emails (e.g. `ses`)
- `PROMOTIONAL_PROVIDER` — Which provider handles promotional sends
- `UPDATE_PROVIDER` — Which provider handles update / notification sends
- `MAILER_FROM` — The "from" address for all outgoing mail (e.g. `noreply@yourapp.com`)
- `SES_ACCESS_KEY_ID` — AWS Access Key ID for SES
- `SES_SECRET_ACCESS_KEY` — AWS Secret Access Key for SES
- `SES_REGION` — AWS region where SES is configured (e.g. `us-east-1`)
- `SES_SANDBOX_MODE` — Set to `true` if your SES account is in sandbox (limits sending to verified addresses)

**API security**:
- `MAILER_API_KEY` — The secret key callers must include as `Authorization: Bearer <key>` to use the API

**Queue configuration** (async sends):
- `QSTASH_URL` — Upstash QStash endpoint URL
- `QSTASH_TOKEN` — Upstash QStash auth token
- `QSTASH_CURRENT_SIGNING_KEY` — QStash request verification key
- `QSTASH_NEXT_SIGNING_KEY` — QStash request verification key (rotation)
- `DELIVER_URL` — The public URL of this mailer's queue webhook (e.g. `https://your-mailer.vercel.app/api/queue/deliver`)

#### Design notes for architect

**Layout within the shell:** Standard `<main className="mx-auto max-w-3xl px-4 pt-10 pb-12">`. Page heading: "Settings". No tabs — three `<section>` blocks with `<h2>` headings.

**Summary card at top:**

```
┌─────────────────────────────────────────────┐
│  ✅  11 of 13 variables configured          │
│  ❌  2 missing — see below                  │
└─────────────────────────────────────────────┘
```

Green border + bg if all set. Amber border + bg if any missing.

**Per-var row:**

```
MAILER_API_KEY          ✅ Set
Your API secret key — callers must send Authorization: Bearer <key>
```

```
SES_REGION              ❌ Missing
AWS region where SES is configured. Example: us-east-1
```

Missing rows: red text for name + badge. Set rows: muted name, green badge. Description always in muted body text below the name row.

**"How to set these" section:**

Three expandable blocks (HTML `<details>`/`<summary>` — no JS):
1. **Vercel** — go to Project → Settings → Environment Variables → Add new → Redeploy
2. **Railway** — Variables tab in your service
3. **Local development** — copy `.env.example` to `.env.local`, fill in values, restart `npm run dev`

**Implementation:** Pure Server Component. Reads `process.env` directly. No factory pattern needed (page.tsx is thin enough). Import `REQUIRED_ENV_VARS` from `src/lib/env.ts` (already exported) and build a simple map of `{ key, set: boolean, description, group }`.

**Files to create:**

| File | Action |
| --- | --- |
| `src/app/settings/page.tsx` | Server Component — renders the settings page |
| `src/settings/index.ts` | Pure helpers — `SettingsVar` type, `buildSettingsReport`, group definitions, descriptions |
| `src/settings/index.test.ts` | Tests for `buildSettingsReport` |

#### Constraints

- Never render env var values — only set/missing status.
- No auth required (unlike `/health`) — this page is safe to expose because it reveals no secrets.
- Server Component only — no `"use client"` in `src/settings/`.
- Reuse `REQUIRED_ENV_VARS` from `src/lib/env.ts` as the canonical list — do not duplicate it.

### 2026-05-25 — implementation (coder)

**Files written:**

- `src/settings/index.ts` — new pure helper module: exports `SettingsGroup`, `SettingsVar` (with `required` field), `SettingsReport`, and `buildSettingsReport`. Contains `SETTINGS_VARS` array with all 13 `REQUIRED_ENV_VARS` plus `SES_SANDBOX_MODE` (marked `required: false`). Summary counts (totalCount, setCount, missingCount) cover required vars only.
- `src/settings/index.test.ts` — 8 tests covering: set/unset/empty-string semantics, totalCount (13), setCount, missingCount, SES_SANDBOX_MODE required=false, all required vars required=true.
- `src/app/settings/page.tsx` — replaced stub with full Server Component. Renders summary card (green/amber), three grouped sections via `VarRow` sub-component, "How to set these" as three `<details>`/`<summary>` blocks.

**Unexpected discovery:** The work unit notes mentioned `QSTASH_URL` in the groupings but the coordinator spec explicitly excluded it. `DATABASE_URL` is in `REQUIRED_ENV_VARS` and is included in the provider group with an explanatory description.

**Test results:** 396 tests, 24 files — all pass. Exit code 0.

**Ready for tester:** `src/settings/index.test.ts` covers `buildSettingsReport`. `src/app/settings/page.test.tsx` (pre-existing) covers metadata export and still passes.

**Not done:** Nothing — all acceptance criteria are met.
