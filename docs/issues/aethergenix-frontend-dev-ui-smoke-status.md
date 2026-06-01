# AetherGenix Frontend-Dev UI Smoke Status

Source slice: local docs state for the `feat/frontend-dev` UI smoke effort.

Last updated: 2026-05-19

> **Superseded (2026-06-01).** The studio rewrite (#159) changed the IA: `/explore`
> is now the InspirationSurface marketing catalog, `/create` is the StudioPage
> template gallery, and primary navigation moved to the studio LeftNav. The
> "UI Smoke Coverage" table below — especially the `/explore`, `/create`, and
> `/favorites` rows — describes the pre-rewrite surfaces and is no longer
> accurate. Treat `scripts/ui-smoke.mjs` as the source of truth for current
> coverage; this file is retained only as historical context for issue #24.

## Current Status

The latest Lead integration status after the parallel agent pass is green:

| Gate | Latest known status |
|---|---|
| `npm run test:account` | Passing after final Lead gate |
| `npm run lint` | Passing after final Lead gate |
| `npm run check:brand` | Passing after final Lead gate |
| `npm run build` | Passing after final Lead gate |
| `npm run smoke:ui` | Passing after final Lead gate, with account-center routes included |

This document was first created as a docs-only slice while account-center smoke was still pending. Agent A has since landed the account-center smoke checks in `scripts/ui-smoke.mjs`, so the skip boundary below is now historical rather than current.

## UI Smoke Coverage

Current `scripts/ui-smoke.mjs` banner says the active smoke coverage is:

- Account-center routes.
- Non-account routes.
- Unnamed button checks.
- Dialog accessibility.
- Esc close behavior.
- Tab focus containment.
- Keyboard access.
- Mobile horizontal overflow.
- Dark-first theme behavior.

The script currently runs checks across these product surfaces:

| Surface | Covered examples |
|---|---|
| Theme shell | Dark-first HTML state, old light localStorage handling, no visible theme toggle regression. |
| `/explore` | Empty state, long error wrapping, detail modal close/action target sizing. |
| `/create` | Minimal composer, one reference entry, folded mobile settings, tablet action reachability, completed-task toast dismiss target. |
| App shell | Icon controls maintain 44px tap targets. |
| Announcement modal | Dialog semantics, focus management, Esc close, close controls. |
| Auth modal | Dialog semantics, named controls, Esc close, Tab containment, register verification target sizing. |
| `/history` | Signed-out gate, empty state, search-empty state, authenticated surface, delete confirmation, card preview dialog. |
| `/favorites` | Signed-out gate, empty state, search-empty state, authenticated surface, card preview dialog, remove-to-empty behavior. |
| `/tasks` | Authenticated task surface, deep fallback empty state, filtered empty state. |
| `/workspace/:taskId` | Missing/running/failed task states, selected asset lane, single-image result, zh-CN labels, selected publish/unpublish, selected regenerate, failed image retry, keyboard-openable selection and preview, image preview modal semantics. |
| Smoke fixture safety | All API calls must be handled by smoke fixtures. |
| Account center | Ordinary `/account`, legacy `/billing` and `/recharge`, non-admin `/config` redirect behavior, and admin `/config` technical settings boundary. |

## Account-Center Gap Status

Before Agent A's account-center smoke slice, `scripts/ui-smoke.mjs` logged this boundary:

```text
Skipping account-center routes (/account, /billing, /recharge, /config) as out of scope for issue #24.
```

That skip has now been removed. Current `npm run smoke:ui` includes browser evidence for the account-center contract as well as the non-account UI smoke scope.

Account-center behavior is governed by ADR 0003 and ADR 0004, plus the final local execution notes in `docs/issues/aethergenix-account-credits-domain-model-issues.md`:

- `/account` is the only ordinary account and balance surface.
- `/billing` is a legacy compatibility path and should redirect to `/account`.
- `/recharge` is a legacy compatibility path and should redirect to `/account`.
- `/config` is not visible to ordinary users; non-admin access should redirect to `/account`.
- Admin configuration may expose Sub2API integration language, but ordinary account routes must not expose technical or finance-center vocabulary.

Agent A added smoke coverage for these routes:

- Ordinary `/account` with authenticated AetherGenix account fixture.
- `/billing` and `/recharge` redirect-aware checks that resolve to `/account`.
- Non-admin `/config` redirect-aware check that resolves to `/account`.
- Admin `/config` fixture that remains reachable and can render Sub2API/admin technical settings.
- Forbidden-term checks for ordinary account routes.

The remaining work is no longer to add the basic account-center smoke coverage; it is to finish Lead verification and decide how to reflect the scope change in GitHub issue #24.

## Validation Commands

Use the established local gate sequence for frontend-dev validation:

```powershell
npm run test:account
npm run lint
npm run check:brand
npm run build
npm run smoke:ui
```

For account-center smoke work, the expected evidence is the same full gate sequence with `scripts/ui-smoke.mjs` covering `/account`, `/billing`, `/recharge`, and `/config`.

## Remaining Tracer-Bullet Slices

These are local issue-board slices only. Do not mutate GitHub Issues remotely from this docs slice.

### 1. Final Lead gate after account-center smoke integration

Type: AFK

Blocked by: Agent A account-center smoke slice and all parallel UI hardening slices.

What to build:

Run the complete validation sequence after all parallel agent edits are present in the shared working tree.

Acceptance criteria:

- [ ] `npm run test:account` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run check:brand` passes.
- [ ] `npm run build` passes.
- [ ] `npm run smoke:ui` passes with account-center routes included.
- [ ] `git diff --check` has no whitespace errors.

### 2. Human product review of frontend-dev surfaces

Type: HITL

Blocked by: Slice 1.

What to review:

Review the actual product feel of `/create`, `/explore`, `/workspace/:taskId`, `/history`, `/favorites`, `/tasks`, and account-center routes after the automated smoke gate is green.

Acceptance criteria:

- [ ] Maintainer confirms the Create minimal composer direction.
- [ ] Maintainer confirms the Explore detail/favorite/prompt-reuse direction.
- [ ] Maintainer confirms the Workspace album/selected-asset hierarchy.
- [ ] Maintainer confirms account-center handoff UX remains consistent with ADR 0003/0004.
- [ ] Any P1/P2 product review issues are routed back into AFK slices before PR/commit finalization.

### 3. GitHub issue #24 scope decision

Type: HITL

Blocked by: Slice 1 and maintainer issue hygiene preference.

What to decide:

Decide whether issue #24 should include the now-landed account-center smoke coverage or whether a follow-up issue/comment should record that the original non-account smoke scope was expanded.

Acceptance criteria:

- [ ] Maintainer confirms whether to close #24 after the final gate.
- [ ] If commenting remotely, the comment starts with the required triage disclaimer.
- [ ] The comment includes the final validation commands and scope note that account-center routes are now covered.

### 4. Optional expanded account-center state coverage

Type: AFK

Blocked by: Slice 1 and product review.

What to build:

If the maintainer wants deeper evidence beyond the basic account-center smoke slice, add fixtures for signed-out account, missing recharge URL, and temporary balance unavailable states.

Acceptance criteria:

- [ ] Signed-out account fixture shows sign-in/register instead of balance controls.
- [ ] Signed-in fixture without external recharge URL shows contact-site-owner fallback.
- [ ] Temporarily unavailable balance fixture stays usable and avoids technical backend leakage.
- [ ] Admin technical terms remain limited to admin `/config`.
- [ ] Full validation sequence remains green.

## Optional GitHub Comment Draft for Issue #24

> *This was generated by AI during triage.*

Final local Lead gate is green for `npm run test:account`, `npm run lint`, `npm run check:brand`, `npm run build`, and `npm run smoke:ui`.

Scope update: the original smoke script explicitly skipped account-center routes:

```text
Skipping account-center routes (/account, /billing, /recharge, /config) as out of scope for issue #24.
```

That skip has now been removed locally. The current smoke pass is intended to cover account-center routes as well as the non-account frontend-dev surfaces, including `/explore`, `/create`, `/history`, `/favorites`, `/tasks`, `/workspace/:taskId`, shell tap targets, modal accessibility, keyboard access, mobile overflow, dark-first behavior, and handled smoke fixture APIs.

The account-center product contract now covered by the smoke harness is that `/account` is the ordinary account/balance surface, `/billing` and `/recharge` are legacy redirects to `/account`, and non-admin `/config` redirects to `/account`. Ordinary users must not see Sub2API/API-key/provider/auth URL/test-connection/finance-center/order/payment vocabulary. Admin `/config` remains reachable and may show Sub2API technical settings.

Suggested next action: after the final Lead gate passes, decide whether to close #24 with this expanded smoke scope or leave a linked follow-up for deeper account-center state fixtures.
