# Motion Tokens

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

Functional motion only — no decorative animation. Fast and subtle. Every transition communicates a state change; nothing moves for aesthetics alone.

---

## Durations

| Token | Value | Usage |
| --- | --- | --- |
| `motion.duration.instant` | `0ms` | Focus rings, no-transition state changes |
| `motion.duration.fast` | `100ms` | Hover states, button press, badge colour change |
| `motion.duration.base` | `200ms` | Input focus, dropdown open, modal fade |
| `motion.duration.slow` | `300ms` | Panel slide-in, page transitions |

---

## Easing

| Token | Value | Usage |
| --- | --- | --- |
| `motion.ease.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default — balanced in/out |
| `motion.ease.out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `motion.ease.in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |

---

## Reduced motion

All transitions must respect `prefers-reduced-motion: reduce`:
- All `transition-duration` values collapse to `0ms`
- No transforms, slides, or fades — state changes are instant
- Loading spinners replaced with static "Loading…" text
- Implemented via Tailwind `motion-safe:` / `motion-reduce:` variants throughout
