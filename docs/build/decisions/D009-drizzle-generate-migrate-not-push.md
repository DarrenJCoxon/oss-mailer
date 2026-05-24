# D009 — Drizzle migration workflow: generate + migrate, not push

**Status:** ✅ accepted
**Date:** 2026-05-24
**Supersedes:** —

## Context

Drizzle Kit offers two ways to sync schema changes to the database: `drizzle-kit push` (direct sync, no migration files) and `drizzle-kit generate` + `drizzle-kit migrate` (generates SQL migration files that are committed to the repo, then applied). WU-001 initially used `push` as the AC command. The operator's guardrail explicitly blocks `push` to prevent schema drift with no migration history.

## Decision

All database schema changes use `npm run db:generate` (generates a migration file in `drizzle/`) followed by `npm run db:migrate` (applies it to Neon). The `db:push` script is removed. Migration files are committed to the repository.

## Why

- Migration files provide an auditable history of schema changes.
- The operator's guardrail enforces this pattern project-wide.
- Generate + migrate is appropriate for a production-grade project with a persistent Neon database.

## What this commits future work to

- Every schema change in WU-006 and beyond must produce a migration file via `db:generate` before `db:migrate` is run.
- The `drizzle/` directory is a committed artefact — do not gitignore it.
- Acceptance criteria in all work units that previously referenced `npx drizzle-kit push` are updated to use `npm run db:generate && npm run db:migrate`.
