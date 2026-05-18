# Domain Docs

This repo uses a single-context domain documentation layout.

## Before exploring, read these

- `CONTEXT.md` at the repo root, if it exists.
- `docs/adr/`, if it exists, for architectural decisions touching the area being changed.

If these files do not exist, proceed silently. Do not flag their absence or create them upfront unless the user asks for a documentation workflow.

## Expected structure

```text
/
|-- CONTEXT.md
|-- docs/
|   |-- adr/
|   |   |-- 0001-example-decision.md
|   |-- agents/
|       |-- issue-tracker.md
|       |-- triage-labels.md
|       |-- domain.md
|-- src/
```

## Use the glossary vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`.

If the concept is missing, note it as a domain documentation gap instead of inventing competing vocabulary.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
