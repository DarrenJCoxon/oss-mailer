# Map 2 — Phases of Work

> The middle zoom: how the journey from Map 1 breaks into phases, what each phase delivers, and what has to be true to enter or exit each one.

## Phases at a glance

| # | Phase | What it delivers | Entry condition | Exit condition |
| --- | --- | --- | --- | --- |
| 0 | Foundation | Planning arc complete — architecture, contracts, design system, maps, initial work units | Project started | Phases A–E done; first work units filed |
| 1 | Core Build | Working send pipeline: routing engine, SES adapter, QStash queue, Send Log, Test Send UI, Config Health Check | Phase 0 complete | POST /api/send routes by category; magic links arrive sync; bulk sends queue; Send Log records all sends |
| 2 | OSS Hardening | Production-grade deployment, retry/dead-letter, second provider adapter, contribution docs | Phase 1 gate passes | Cold deploy under 30 min; new provider addable in under 2 hours by docs alone |
| 3 | Release | Public GitHub repo, polished README, contribution guidelines, first external PR merged | Phase 2 gate passes | Repo is public; one merged non-author PR exists |

---

## Phase 0 — Foundation

**What ships:** The project's understanding of itself — personas, horizon map, architecture and contracts, design system, initial work units.

**Entry condition:** Blank project; nothing yet decided.

**Exit condition:** All of:
- Personas P001 and P002 filed
- Map 1 (the horizon) written
- Architecture and module contracts defined
- Design system tokens and components filed
- Phases A–E of the planning arc complete
- First batch of work units filed in Phase E

**Verification gate:** `docs/build/STATE.md` shows all five planning phases `✅ complete`.

This phase is the planning arc itself. No production code ships in Phase 0.

---

## Phase 1 — Core Build

**What ships:** A working, end-to-end email routing system that a developer can run locally and send real email through.

- Routing engine: accepts `sendEmail({ category, to, subject, ... })`, resolves the correct provider per category
- SES adapter: implements the provider interface, sends via AWS SES
- QStash queue: promotional and update sends enqueue via Upstash QStash; magic links bypass the queue and send synchronously
- Send Log: Postgres-backed record of every send attempt (category, provider, status, message ID, timestamp)
- Test Send UI: form-based send trigger; shows success (message ID) or failure (specific error)
- Config Health Check: server-rendered env var checklist + provider routing summary

**Entry condition:** Phase 0 complete; at least the first work unit filed.

**Exit condition:** All of:
- `POST /api/send` routes correctly by category
- Magic link sends arrive in inbox in under 3 seconds
- Promotional/update sends enqueue to QStash and deliver
- Send Log records every attempt with correct status
- Test Send UI returns a message ID on success or a specific error on failure

**Verification gate:** `npx vitest run` exits 0 + manual test send via Test Send UI returns a message ID + email arrives in inbox.

**Risks during this phase:** R001 — AWS SES sandbox mode restricts sending to verified addresses; new deployments must verify a recipient address before end-to-end testing is possible.

---

## Phase 2 — OSS Hardening

**What ships:** A system a stranger can deploy and extend without hand-holding.

- Vercel deploy button + one-command deploy story
- Config Health Check hardened: every required env var documented and checked at startup
- Retry logic and dead-letter handling for the QStash queue
- Second provider adapter (e.g. Mailgun) — proves the extension interface works for third parties
- Contribution docs: how to add a provider, how to run tests locally, how to open a PR

**Entry condition:** Phase 1 verification gate passes.

**Exit condition:** All of:
- A developer unfamiliar with the repo can clone, set env vars, deploy to Vercel, and send a test email in under 30 minutes
- A contributor can implement a new provider adapter by following the contribution docs alone, in under 2 hours

**Verification gate:** Timed cold deploy run completes under 30 minutes + a new provider adapter exists in a branch as proof of the extension point.

---

## Phase 3 — Release

**What ships:** oss-mailer as a real open-source project, not a personal tool.

- Repository published on GitHub (public)
- README: project description, one-command deploy, configuration reference, provider list
- CONTRIBUTING.md: extension interface walkthrough, PR process, local dev setup
- First external contributor PR merged

**Entry condition:** Phase 2 verification gate passes.

**Exit condition:** All of:
- Repository is public on GitHub
- README renders correctly on GitHub.com and covers deploy + configuration
- At least one merged pull request from a non-author contributor

**Verification gate:** Repo is public at its GitHub URL; `CONTRIBUTING.md` exists; one merged non-author PR visible in the PR history.

---

## How phases work in practice

Phases are signposts, not hard gates. Work doesn't strictly stop at a boundary — but the catalogue's progress is best measured by which phases have completed. When you finish a phase, update STATE.md, file a session log noting the transition, and refresh Map 3 for the next phase's outlook.

A phase can be revised. If a Phase 2 discovery invalidates a Phase 1 assumption, file the open question, resolve it as a decision, and update this map to match reality. The map's job is to be accurate, not to be right the first time.
