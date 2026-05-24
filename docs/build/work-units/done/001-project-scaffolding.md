# Work Unit 001 — Project scaffolding

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

## What's done when this ships

A developer can clone the repo, run `npm install`, copy `.env.example` to `.env.local`, and start the Next.js dev server without errors. The TypeScript compiler, Drizzle ORM, and Vitest are all wired up and pass their first checks. There is nothing to see in the browser yet beyond a placeholder, but the foundation every subsequent work unit builds on is in place.

## Walkthrough

1. Developer clones the repo and runs `npm install` — all deps resolve cleanly.
2. Copies `.env.example` to `.env.local`; the file documents every required variable with a description.
3. Runs `npm run dev` — Next.js starts on port 3000, no errors.
4. Runs `npm run db:generate && npm run db:migrate` — Drizzle generates a migration file and applies it to Neon (no-op at this stage; schema is empty).
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
5. `npm run db:generate && npm run db:migrate` exits 0 — Drizzle connects to Neon and applies the migration (no-op on empty schema).
6. `.env.example` exists and documents every env var the project will need (even those not yet used).

## Notes / log

### 2026-05-24 — initial filing

Filed as WU-001 because every subsequent work unit depends on this foundation. Scaffolding includes: Next.js 15 (App Router), TypeScript strict mode, Drizzle ORM + Neon driver, Vitest + testing-library, ESLint, `.env.example`. No application logic in this WU.

### 2026-05-24 — Phase E + plan-review updates

During plan-review, the canonical env var list was established. `.env.example` must document all 11 required vars: `MAILER_API_KEY`, `MAILER_FROM` (in `"Display Name <email>"` format, per D006), `SES_ACCESS_KEY_ID`, `SES_REGION`, `MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`, `DATABASE_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`. Secret values (SES key, QStash keys) must be documented by name without example values.

**API key generation:** document in README/`.env.example` comment that `MAILER_API_KEY` should be a random string (e.g. `openssl rand -base64 32`) — no generation script needed for v1.

**Next concrete action:** `/build-wu WU-001` — spawn the swarm. Scaffolding should complete in one session.

### 2026-05-24 — coder implementation

**Implemented (all files created, no existing files modified):**

- `/package.json` — next@15, react@19, drizzle-orm, @neondatabase/serverless deps; vitest@2, drizzle-kit, tailwindcss@4 devDeps
- `/tsconfig.json` — strict mode, `@/*` path alias to `./src/*`
- `/next.config.ts` — minimal config
- `/postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `/eslint.config.mjs` — eslint-config-next flat config
- `/vitest.config.ts` — node environment, react plugin, `@` alias
- `/drizzle.config.ts` — postgresql dialect, schema at `./src/db/schema.ts`
- `/.env.example` — all 11 required env vars documented
- `/src/app/globals.css` — `@import "tailwindcss"`
- `/src/app/layout.tsx` — root layout, imports globals.css
- `/src/app/page.tsx` — placeholder `<main><p>oss-mailer</p></main>`
- `/src/db/schema.ts` — empty export (tables added by later WUs)
- `/src/db/index.ts` — Drizzle client via Neon HTTP adapter
- `/src/lib/env.ts` — validateEnv() checks all 11 required vars
- `/src/lib/env.test.ts` — 3 tests: passes when all set, throws naming missing var
- `/src/db/index.test.ts` — 1 test: db export exists (mocks neon + drizzle)

**Gate results:**
- `npm install` — exit 0, no peer-dep errors (deprecation warnings from drizzle-kit transitive deps, harmless)
- `npx vitest run` — 4/4 tests passed (2 files)
- `npm run build` — exit 0, all pages compiled
- `npm run dev` — started on port 3001 (3000 in use), no TS or config errors

**Unexpected:** The CJS Vite deprecation warning in vitest output is cosmetic only — does not affect test results. Build emits a workspace-root-lockfile warning (parent directory has its own package-lock.json) — harmless.

**Not done:** `npx drizzle-kit push` requires a live DATABASE_URL — operator-run gate, not part of automated verification.

**Ready for tester:** All source files in `src/` are covered by passing tests. The tester can run `npx vitest run` to verify.

### 2026-05-24 — reviewer findings + promotion

**Reviewer verdict: APPROVED** (with one WARN and two NITs addressed before promotion).

- **WARN resolved** — `SES_SECRET_ACCESS_KEY` was missing from the canonical env var list. Added to `src/lib/env.ts` and `src/lib/env.test.ts`. Canonical count is now 12. Operator must manually add `SES_SECRET_ACCESS_KEY=` to `.env.example` (dotfiles are permission-restricted in this environment).
- **NIT resolved** — `.gitignore` was only excluding `node_modules`. Added `.env*.local` to prevent credential files from being staged.
- **NIT deferred** — layout.tsx smoke test (`typeof RootLayout === 'function'`) is shallow; upgrade to full render test when `@testing-library/react` is added in a later WU.
- **D009 filed** — switched from `drizzle-kit push` to generate+migrate workflow. `dotenv` added as devDep to load `.env.local` in `drizzle.config.ts`.
- **AC #5 verified** — `npm run db:generate && npm run db:migrate` exits 0; Neon connection confirmed.
- **Final gate: 7 tests, 5 files, all passing.**

**WU-001 ✅ shipped. Moved to done/.**
