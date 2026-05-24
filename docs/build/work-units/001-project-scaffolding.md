# Work Unit 001 — Project scaffolding

**Status:** 🟡 in flight
**For:** [P001 — Indie SaaS Developer](../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

## What's done when this ships

A developer can clone the repo, run `npm install`, copy `.env.example` to `.env.local`, and start the Next.js dev server without errors. The TypeScript compiler, Drizzle ORM, and Vitest are all wired up and pass their first checks. There is nothing to see in the browser yet beyond a placeholder, but the foundation every subsequent work unit builds on is in place.

## Walkthrough

1. Developer clones the repo and runs `npm install` — all deps resolve cleanly.
2. Copies `.env.example` to `.env.local`; the file documents every required variable with a description.
3. Runs `npm run dev` — Next.js starts on port 3000, no errors.
4. Runs `npx drizzle-kit push` — Drizzle connects to the Neon database and confirms schema is ready (empty at this stage).
5. Runs `npx vitest run` — test suite exits 0 (no tests yet, but the runner is wired).
6. Runs `npm run build` — Next.js build succeeds.

**What if something goes wrong:**
- Missing env var: dev server logs a clear startup error naming the missing variable.
- DB connection failure: `drizzle-kit push` exits with a descriptive Neon connection error.

## How we'll know it's done

1. `npm install` exits 0 with no peer-dependency errors.
2. `npm run dev` starts Next.js with no TypeScript or config errors.
3. `npx vitest run` exits 0.
4. `npm run build` exits 0.
5. `npx drizzle-kit push` connects to Neon and exits 0.
6. `.env.example` exists and documents every env var the project will need (even those not yet used).

## Notes / log

### 2026-05-24 — initial filing

Filed as WU-001 because every subsequent work unit depends on this foundation. Scaffolding includes: Next.js 15 (App Router), TypeScript strict mode, Drizzle ORM + Neon driver, Vitest + testing-library, ESLint, `.env.example`. No application logic in this WU.

### 2026-05-24 — Phase E + plan-review updates

During plan-review, the canonical env var list was established. `.env.example` must document all 11 required vars: `MAILER_API_KEY`, `MAILER_FROM` (in `"Display Name <email>"` format, per D006), `SES_ACCESS_KEY_ID`, `SES_REGION`, `MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`, `DATABASE_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`. Secret values (SES key, QStash keys) must be documented by name without example values.

**API key generation:** document in README/`.env.example` comment that `MAILER_API_KEY` should be a random string (e.g. `openssl rand -base64 32`) — no generation script needed for v1.

**Next concrete action:** `/build-wu WU-001` — spawn the swarm. Scaffolding should complete in one session.
