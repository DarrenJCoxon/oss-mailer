# Data Table with Filters

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

## What it is

A filterable data table — filter controls above the table, results update as filters change.

## When to use it

Any surface displaying a list of records that benefits from filtering. Used on Send Log.

## Anatomy

1. [PageHeader](../components/page-header.md) — page title
2. Filter bar — horizontal row of [Select](../components/select.md) inputs (category, status); `space.4` below header
3. [DataTable](../components/data-table.md) — full width, `space.4` below filter bar
4. [EmptyState](../components/empty-state.md) — replaces table when no results match filters

## Tokens consumed

- **Spacing:** `space.4` between header, filter bar, and table
- **Layout:** full content width up to `layout.max.width`
- **Breakpoints:** filter bar stacks vertically on mobile; table scrolls horizontally

## Behaviour

### At different breakpoints

- Desktop: filter bar in a single horizontal row
- Mobile: filter controls stack vertically; table scrolls horizontally with sticky first column

### In different states

| State | Behaviour |
| --- | --- |
| Loading | Table rows replaced with skeleton rows (3px grey bars at `colour.neutral.surface`, animated pulse via `motion.duration.slow`) |
| Empty (no data) | [EmptyState](../components/empty-state.md) with "No sends yet" copy |
| Empty (filtered) | [EmptyState](../components/empty-state.md) with "No results match your filters. Clear filters to see all sends." |
| Error | Error banner above table — "Could not load send log. Check your database connection." |

## Examples

| Surface | Usage |
| --- | --- |
| [Send Log](../../ui-ux/send-log.md) | Full send history, filterable by category and status |
