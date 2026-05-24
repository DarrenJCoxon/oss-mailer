# Session — 2026-05-24 — Phase A: Orientation

## What this session was about

First session on a brand-new catalogue. Ran the full Phase A Orientation protocol: established the project name, description, tech stack, two personas, Map 1 — The Horizon, two decisions, and one open question (immediately resolved). Phase A is complete; Phase B (Architecture & Contracts) is next.

## What was done

1. **Operator mode set** — Developer (terse, technical, no hand-holding). Saved to `methodfile.json`.
2. **Project named and described** — oss-mailer: a self-hosted, open-source email routing layer that sits in front of cheap commodity providers (AWS SES) and routes magic link, promotional, and update emails at a fraction of Postmark/Resend cost. ~$1/month at 10k emails vs $15/month on Postmark.
3. **Tech stack filed** — Next.js 15 (App Router), Drizzle + Neon (Postgres), React Email, Upstash QStash, AWS SES, Vercel.
4. **Open source decision made** (D001) — oss-mailer is self-hosted, open-source, no SaaS layer, no billing, no multi-tenancy. Users bring their own credentials and deploy their own instance.
5. **P001 filed** — Indie SaaS Developer: cost-conscious dev running one or more SaaS products, wants reliable email without Postmark/Resend pricing.
6. **P002 filed** — Open Source Contributor: dev who uses oss-mailer, hits a gap, wants to add a provider or feature and contribute it back. Key constraint: extension point must be one file, one interface.
7. **Map 1 filed** — The Horizon: full project narrative including what done looks like, the three-stage journey (core build → harden for OSS → release and community), and explicit out-of-scope items (no SaaS, no analytics, no inbound email, no template UI, no multi-tenancy).
8. **No-fallback decision made** (D002) — Router picks provider by email category; no failover between providers. SES goes down → queue retries on schedule. Simpler and SES uptime (~99.9%) makes failover logic unnecessary.
9. **Q001 raised and immediately resolved** → D002. The question was which fallback provider to ship; the answer was none.
10. **R001 filed** — AWS SES sandbox mode: new deployers start in sandbox (verified addresses only) until they request production access. Medium risk; needs clear documentation in the README.

## Decisions made

- [D001 — Open-source and self-hosted](../decisions/D001-open-source-self-hosted.md)
- [D002 — No fallback provider, routing by category](../decisions/D002-no-fallback-routing-by-category.md)

## Open questions raised

- Q001 — resolved in session → D002 (no row needed)

## Risks identified

- R001 — AWS SES sandbox mode (see `risks/_index.md`)

## What's next

Phase B — Architecture & Contracts. Name the major modules (API layer, router, provider adapters, queue, template renderer, log store) and define what each one provides and consumes. The P002 constraint — clean provider extension point — must be an explicit output of Phase B.

## Resume hint

Phase A is fully complete. No mid-task state. Next session: run `/start-of-session` → it will read STATE.md, see Phase B is `🟡 next`, and route to `/plan-architecture`. Key things to resolve early in Phase B: the provider adapter interface (the thing P002 contributes to), and the shape of the send request API (what the developer calls from their backend).
