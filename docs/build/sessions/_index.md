# Sessions

A **session** is a period of focused work — could be an hour, could be an afternoon. Each session starts with `/start-of-session` (which tells you where the project is) and ends with `/end-of-session` (which writes down what just happened). One file per session lives here in date order, named `YYYY-MM-DD-short-description.md`. See [the glossary](../GLOSSARY.md#session) for the full definition.

The session log is the project's **replay history**. Anyone joining mid-project — or future-you opening this folder six months later — should be able to read the most recent entries and pick up exactly where work stopped, without needing to ask.

## Index

| Date | Session | Active work unit | Notes |
| --- | --- | --- | --- |
| 2026-05-24 | [Phase A — Orientation](2026-05-24-phase-a-orientation.md) | — (planning) | Phase A complete. D001, D002 filed. P001, P002, Map 1 filed. Phase B next. |
| 2026-05-24 | [Phase B — Architecture & Contracts](2026-05-24-phase-b-architecture.md) | — (planning) | Phase B complete. 7 modules + contracts filed. D003 filed. Phase C next. |
| 2026-05-24 | [Phase C — UI/UX + Design System](2026-05-24-phase-c-uiux.md) | — (planning) | Phase C complete. 3 surfaces, full design system, D004. Phase D next. |
| 2026-05-24 | [Phase D — Maps](2026-05-24-phase-d-maps.md) | — (planning) | Phase D complete. Map 2 (3 phases + gates) and Map 3 (near-term) filed. D005. Phase E next. |
| 2026-05-24 | [Phase E — Initial Work Units + Plan Review](2026-05-24-phase-e-initial-wus.md) | WU-001 | Planning arc complete. 11 WUs filed. D006, D007, D008. 30+ review findings resolved. WU-001 in flight. |

## What a session entry captures

- **What this session was about** — one paragraph
- **What was done** — chronological, in plain language
- **Decisions made** — linked to the D-NNN files filed in this session
- **Open questions raised** — linked to the Q-NNN files
- **Risks identified** — linked
- **What's next** — the next concrete action; what the next session should start with
- **Resume hint** — if mid-phase (planning or work) when this session ended, a one-paragraph note of where you were so the next session picks up cleanly

The honest test for a good session entry: **could a future-you (or anyone joining the project) read it and answer "what happened, why, and what's next?" without contacting you?** If yes, the entry is sufficient.

## How session entries are filed

Run `/end-of-session`. It writes the entry, updates this index, refreshes STATE.md, commits everything in one atomic step, and the post-commit hook refreshes the search index in the background.

**Never close a session without `/end-of-session`.** Work that isn't written down is work that's lost. The whole catalogue is built on the assumption that every period of work gets captured before it closes.
