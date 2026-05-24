# Project Agent Instructions

## Frontend design system

The canonical AetherGenix frontend design system is:

```text
src/design-system/design.md
```

The canonical static preview is:

```text
src/design-system/preview/index.html
```

The React execution layer is:

```text
src/components/design-system/
```

Before developing or changing frontend UI, read `src/design-system/design.md` and inspect the existing React primitives. Build pages from the existing design-system components and layout patterns first.

Hard rules:

- The static spec in `src/design-system/design.md` is the source of truth; React components, `/design-system`, and docs references must conform to it.
- Active production routes must use `src/components/design-system/` primitives for reusable buttons, icon buttons, fields, surfaces, dialogs, drawers, status pills, and surface states before launch.
- Reusable UI belongs in `src/components/design-system/`, not hidden inside one page.
- If an existing component is close, extend it with props, variants, slots, or class hooks before creating a similar component.
- Create a new component only when no existing component can reasonably cover the responsibility and the pattern will recur.
- Do not duplicate page-level Button, Card, Form, Navigation, Toolbar, Table, Status, Modal, Drawer, or Layout styling inside feature pages.
- Any new reusable token, component, or layout pattern must be added to `src/design-system/design.md` and represented in the static preview.
- One-off CSS is allowed only as page layout glue, not as a hidden second design system.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `H-Chris233/Image`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default Matt Pocock triage label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context domain documentation layout. See `docs/agents/domain.md`.
