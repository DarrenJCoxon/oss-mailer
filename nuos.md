# NuOS Build Method

This project uses the NuOS Build Method. The AI should follow NuOS protocols when working in this codebase.

## Available commands

- `/start-of-session` — read where the project is; propose the next action
- `/end-of-session` — write session log, update STATE.md, commit
- `/build-wu <handle>` — run the swarm on a work unit (e.g. `/build-wu WU-004`)
- `/wu-new` — file a new work unit
- `/persona-new` — add a new persona to the catalogue

## Starting a session

Always begin with `/start-of-session`. It reads the current project state from `docs/build/STATE.md` and tells you where things are.

Never close a session without `/end-of-session`.
