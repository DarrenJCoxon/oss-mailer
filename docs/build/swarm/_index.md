# Swarm runs

Every time the operator invokes `/build-wu <handle>` (or the AI orchestrates agents against a work unit), the run gets a permanent record here. The swarm register is the audit trail: which agents were spawned, which models they used, what they produced, what shipped, what didn't, and why.

This is **load-bearing for cost auditability** — if you ever wonder "is the swarm worth it? where is the spend going?", these files answer.

## Index

| Date | Work unit | Outcome | Cost (est.) |
| --- | --- | --- | --- |
| 2026-05-24 | [WU-001 — Project scaffolding](2026-05-24-wu-001.md) | APPROVED ✅ | ~$0.27 |
| 2026-05-24 | [WU-002 — EmailProvider interface + SES adapter](2026-05-24-wu-002.md) | APPROVED ✅ | ~$0.79 |
| 2026-05-24 | [WU-003 — Router](2026-05-24-wu-003.md) | APPROVED ✅ | ~$0.47 |
| 2026-05-25 | [WU-004 — Template Renderer](2026-05-25-wu-004.md) | APPROVED ✅ | ~$0.58 |
| 2026-05-25 | [WU-005 — Mail Sender](2026-05-25-wu-005.md) | APPROVED ✅ | ~$0.65 |
| 2026-05-25 | [WU-006 — Send Log backend](2026-05-25-wu-006.md) | APPROVED ✅ | ~$0.75 |
| 2026-05-25 | [WU-007 — Queue](2026-05-25-wu-007.md) | APPROVED ✅ | ~$1.90 |
| 2026-05-25 | [WU-008 — API endpoint](2026-05-25-wu-008.md) | APPROVED ✅ | ~$1.75 |
| 2026-05-25 | [WU-009 — Test Send UI](2026-05-25-wu-009.md) | APPROVED ✅ | ~$1.55 |
| 2026-05-25 | [WU-010 — Config Health Check UI](2026-05-25-wu-010.md) | APPROVED ✅ | ~$1.25 |
| 2026-05-25 | [WU-011 — Send Log Dashboard UI](2026-05-25-wu-011.md) | APPROVED ✅ | ~$1.38 |

## What a swarm run captures

For each run:

- **Work unit** — handle + title; the input
- **Classification** — design-only / implementation / full-feature / bug-fix / research-first
- **Decomposition** — the subtasks the coordinator identified
- **Agents spawned** — one row per spawn: role, model used, input summary, output summary, approximate time
- **Outcome** — APPROVED / REQUEST CHANGES (with retry count) / ESCALATED (to operator or architect)
- **Decisions / open questions / risks that surfaced** — links to the catalogue entries that were filed
- **Cost** — best-effort estimate based on agent count, model tier, and approximate context size

The audit trail tells you whether the swarm worked, what it cost, and where (if anywhere) the work routed back to the operator for a decision.

## How runs get filed

Automatic. The `build-wu` protocol writes one file per run at `swarm/YYYY-MM-DD-wu-<handle>.md` and adds a row to this index. The post-commit hook re-indexes the catalogue after the swarm's commit lands, so future `nuos-catalogue search` queries find these audit entries.

## How to use the register

- **Reviewing cost over time** — sort by cost column to see which work units have been expensive; reflect on whether they were scoped too large
- **Tracking patterns in escalation** — if "ESCALATED to operator" rows cluster around a specific module or concern, that's a signal that the contracts in that area need sharpening
- **Onboarding** — a new contributor can read the most recent swarm runs to see how the project's work units actually got built; the runs explain WHY a piece of code looks the way it does
