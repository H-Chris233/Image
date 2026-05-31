# AetherGenix Design System

Canonical source of truth for AetherGenix Image frontend UI.

Status: canonical  
Version: v1.0  
Last updated: 2026-05-24  
Static preview: `src/design-system/preview/index.html`  
React execution layer: `src/components/design-system/`  
Internal app preview: `/design-system`

This file is the design system. Runtime tokens, React primitives, page implementations, smoke tests, and older docs must conform to it. If they disagree, update the implementation or reference docs to match this file.

## Product UI Posture

AetherGenix is an AI image generation workbench for merchants and creators. The interface should feel like a production tool for repeated image work: calm, dense enough for real workflows, visually warm, and quiet around generated images.

Primary workflows:

- Browse public inspiration cases, reuse prompts, and move into creation.
- Compose text and reference-image generation tasks.
- Track queued, running, succeeded, and failed generation tasks.
- Review generated results in a task workspace.
- Manage history, favorites, account identity, balance, and recharge handoff.
- Let admins configure technical integration without exposing those terms to ordinary users.

Core posture:

- Dark-first Warm Charcoal UI.
- Image content is the visual subject; controls support it.
- Cream primary actions, lime state accents, orange commercial actions.
- No cold blue SaaS theme, cyan/violet primary gradients, or decorative cosmic backgrounds for new UI.
- Compact operational surfaces beat marketing-style hero sections.

## Source Hierarchy

Canonical static spec:

- `src/design-system/design.md`
- `src/design-system/preview/index.html`

Execution layer:

- `src/index.css` contains runtime Tailwind v4 `@theme` tokens and compatibility utilities.
- `src/components/design-system/` contains React primitives that implement this spec.
- `src/pages/DesignSystem.tsx` and `/design-system` preview the React execution layer only.

Reference docs:

- `docs/design.md`
- `docs/design-system/*`
- ADRs that explain historical decisions.

Reference docs may explain context, migration history, or route-specific notes, but they must not define conflicting rules.

## Design Variables

### Color

Use semantic roles first. Raw values are listed so the static preview, Tailwind tokens, and components can stay aligned.

| Role | Value | Usage |
|---|---:|---|
| `background` | `#111110` | app canvas, nav background, drawer background |
| `surface` | `#1a1917` | cards, dialogs, main panels |
| `surface-container` | `#242220` | raised groups, nested controls |
| `surface-container-high` | `#2e2c29` | hover, active layer, elevated group |
| `surface-control` | `#3a3835` | close buttons, local control surface |
| `outline` | `#504d49` | visible warm outline |
| `outline-subtle` | `rgba(255,255,255,0.06)` | default dark borders |
| `on-surface` | `#f0ede8` | primary text and cream action background |
| `on-surface-variant` | `#8a8680` | secondary text, muted icons |
| `muted-low` | `#4a4844` | placeholder, small group labels |
| `lime` | `#E3FF74` | selected, running, notification, focus |
| `lime-dim` | `#c8e84a` | lower-emphasis lime |
| `orange` | `#fe6e00` | recharge, purchase, commercial CTA |
| `success` | `#4ade80` | succeeded state |
| `error` | `#ff6b6b` | failed, destructive, validation error |

Light mode is a support mode, not the primary brand expression:

| Role | Value | Usage |
|---|---:|---|
| `background-light` | `#f9f8f6` | light app canvas |
| `surface-light` | `#ffffff` | light cards |
| `surface-container-light` | `#f2f0ed` | light nested groups |
| `on-surface-light` | `#1a1917` | light primary text |
| `on-surface-variant-light` | `#6b6660` | light secondary text |

Color rules:

- Charcoal builds structure.
- Cream is text and the default primary action.
- Lime is state and focus; use it small.
- Orange is commercial intent; do not use it for selected state.
- Red is errors and destructive actions; do not use orange for errors.
- Do not add cyan or violet primary CTAs, focus rings, active nav states, or main gradients.
- Do not use pure black for large surfaces. Masks may use black opacity.

### Typography

Fonts:

- `font-display`: Bricolage Grotesque, then Inter, then sans-serif. Use for brand name, page title, and important panel title.
- `font-sans`: Inter, then system sans-serif. Use for body, forms, buttons, navigation.
- `font-mono`: JetBrains Mono, then system monospace. Use for ids, paths, commands, and technical admin diagnostics.

Scale:

| Role | Size | Notes |
|---|---:|---|
| page title | `text-2xl` to `text-3xl` | display font, tight but readable |
| modal title | `text-lg` to `text-xl` | no hero type inside dialogs |
| panel title | `text-base` to `text-lg` | scan-friendly |
| card title | `text-sm` to `text-base` | dense work surfaces |
| body | `text-sm` | default operational copy |
| support text | `text-xs` to `text-sm` | muted |
| form label | `text-xs` | muted, compact |
| bottom tab label | `text-[10px]` | truncate, never wrap |

Typography rules:

- Do not scale font size with viewport width.
- Letter spacing is normally `0`; use uppercase tracking only for small group labels.
- Chinese body copy needs comfortable line height: `leading-6` or `leading-7`.
- Reserve large display type for true page headers.

### Spacing

Use a 4px base scale.

| Role | Value |
|---|---:|
| icon button | `h-11 w-11` |
| compact input | `h-11` |
| standard input | `h-11` |
| primary action | `h-11` |
| panel padding | `p-4` to `p-6` |
| card gap | `gap-3` to `gap-5` |
| page gutter | mobile `px-4`, desktop constrained container |
| top nav | `h-16` |
| desktop side nav | `w-60` |
| mobile bottom nav | `h-16` |

Spacing rules:

- Fixed-format controls need stable dimensions.
- Toolbars keep one height rhythm.
- Mobile pages reserve bottom padding when the bottom tab bar is present.
- Avoid thick nested-card spacing. Use lower-opacity surfaces for inner grouping.

### Radius

| Role | Value |
|---|---:|
| small controls | `rounded-lg` |
| icon buttons, nav items, thumbnails | `rounded-xl` |
| panels, dialogs, image cards | `rounded-2xl` |
| primary buttons, pills | `rounded-full` |

Cards should normally stay at 8px radius or less in generic SaaS tools, but this product has already established rounded image-workbench surfaces. Use rounded-2xl only for image cards, dialogs, panels, and upload states where the existing Warm Charcoal system expects it.

### Borders

- Default dark border: `border-white/[0.05]` to `border-white/[0.08]`.
- Hover border: `border-white/[0.1]` or small lime alpha.
- Upload and empty states: dashed warm border.
- Avoid decorative multi-color borders.

### Shadows

| Role | Value |
|---|---|
| raised card | `0 8px 40px rgba(0,0,0,0.5)` |
| dialog | `0 24px 64px rgba(0,0,0,0.7)` |
| image hover | `0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.06)` |
| lime glow | `0 0 16px rgba(227,255,116,0.3), 0 0 48px rgba(227,255,116,0.1)` |
| orange glow | `0 0 16px rgba(254,110,0,0.35), 0 0 48px rgba(254,110,0,0.12)` |

Glow is a state accent, not a page background.

### Motion

Tokens:

- `--ag-ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- `--ag-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`
- `ds-motion-tree`: tree navigation motion language for T1/T2 sections.
- `ds-sticky-morph`: sticky scroll-state header motion for T0 and long workspace surfaces.
- `ds-stage-enter`, `ds-panel-enter`, `ds-motion-card`, `ds-motion-press`: shared production-workbench motion utilities.
- `ds-workbench-*`: shared T3 card, T3 detail, and T4 composer shell structure.

Durations:

- Hover feedback: 150-200ms.
- Tree nav trigger feedback: 160-220ms.
- Tree nav child reveal: 220-280ms, with 18ms item staggering.
- Modal and drawer: 250-300ms.
- Image hover scale: 300-500ms.
- Page element enter: fade and 8px upward movement.

Motion rules:

- Respect reduced-motion preferences.
- Do not make animation the only way to understand state.
- Avoid constant full-page glow or decorative movement.
- Use motion to explain hierarchy, continuity, and cause/effect.
- Reusable motion belongs in design-system primitives or `ds-*` utilities, not page-local animation classes.
- Keep tree navigation sections mounted; do not conditionally render children just to animate them.
- T1/T2 reveal uses CSS grid rows, opacity, and small Y movement; JS may switch state but must not calculate animation frames.
- Child item reveal may stagger subtly, but must stay short enough for repeated production work.

### Icons And Imagery

- Use Lucide React for app icons.
- Buttons and toolbar icons: 13-16px.
- Bottom tabs: 20px.
- Page or empty-state icons: 18-24px.
- Do not use emoji as product UI icons.
- Real generated images are the visual subject.
- Image overlay copy must not cover too much of the image.
- Image alt text comes from title, prompt, or current task prompt.

## Component System

React components live in `src/components/design-system/`, but this section defines their required behavior.

### Button

Purpose: explicit commands such as generate, submit, download, recharge, delete.

Variants:

- `primary`: cream pill, default strongest action.
- `ghost`: secondary action.
- `lime`: selected, running, or rare high-priority state action.
- `orange`: recharge, purchase, commercial action.
- `danger`: destructive or failure recovery action.
- `plain`: low-emphasis text or icon-adjacent action.

Rules:

- One strongest primary action per viewport region.
- Default submit uses `primary`, not `lime`.
- Recharge or purchase uses `orange`.
- Delete uses `danger`.
- Disabled state keeps shape and uses opacity, not a separate grey design.
- Loading uses spinner plus inherited text color.

### IconButton

Purpose: upload, refresh, close, more actions, notifications, image tools.

Rules:

- Must have an accessible label.
- Default size is 44x44px for app UI smoke compatibility and touch ergonomics.
- Use familiar icons instead of text inside small square controls.
- Close buttons in dialogs and drawers use this pattern or equivalent semantics.

### Surface

Purpose: panels, dialog bodies, state containers, tool groups.

Tones:

- `default`
- `raised`
- `subtle`
- `dashed`
- `lime`
- `orange`
- `danger`

Rules:

- Do not turn every page section into a floating card.
- Do not put cards inside cards as a default layout.
- Inner groups use low-transparent surfaces, not thick nested panels.

### Field, TextInput, TextareaField, SelectField

Purpose: form controls.

Rules:

- Label is compact and muted.
- Standard and compact app controls use at least `h-11` so visible targets meet 44px.
- Focus uses lime border or ring.
- Error uses red.
- Placeholder is muted.
- Prompt textarea may be visually integrated into a larger composer surface.

### SegmentedControl

Purpose: create mode, filter mode, workflow branch selection.

Rules:

- Active uses cream surface and charcoal text.
- Inactive uses muted text.
- Do not replace mode switches with underline tabs.
- Each segment keeps stable dimensions on mobile.

### MotionTreeNav

Purpose: expandable T1/T2 navigation for production workspaces.

Rules:

- All T1 sections stay mounted.
- T2 children stay in the DOM and reveal through CSS grid rows.
- `aria-expanded` is set on the T1 trigger.
- Active T2 uses `aria-current="page"`.
- Icon scale, section background, chevron rotation, and child reveal move as one state change.
- Do not use this component for ordinary dropdown menus or command palettes.
- Do not add page-local accordion animation when this primitive can express the hierarchy.

### StickyMorphHeader

Purpose: sticky header that reshapes on scroll for inspiration, gallery, and long workspace surfaces.

Rules:

- Uses CSS scroll-state container queries when supported.
- JS must not listen to scroll or calculate animation frames.
- Page code supplies brand and actions; the component owns sticky structure and morph motion.
- Morph only density, border, background, radius, and small supporting text emphasis.
- Do not use it as a modal header, command palette, or short panel header.

### WorkbenchCard

Purpose: selectable T3 cards inside production workspaces.

Rules:

- Use for scenario, workflow, asset, and inspiration cards that open a T3 detail or T4 composer.
- Must expose title, description, active state, icon, and action label.
- Active state uses lime; commercial intent still uses orange elsewhere.
- Card hover may lift slightly through `ds-motion-card`.
- Do not create page-local T3 card markup for create, redraw, assets, inspiration, or user workflows.

### WorkbenchDetailPanel

Purpose: side detail panel for the selected T3 item.

Rules:

- Owns eyebrow, title, description, empty state, and compact action chips.
- It explains current context; it does not execute generation.
- Keep copy compact enough for repeated production work.
- Do not use it as a modal, drawer, or long-form help panel.

### WorkbenchComposerPanel

Purpose: T4 execution panel for create, redraw, asset actions, or confirmation handoff.

Rules:

- Owns composer heading, active/empty state, optional structured payload preview, and primary action placement.
- Primary execution action uses the design-system `Button`.
- T4 is the only layer that executes generation or asset mutation.
- Workflow modules pass payload and action handlers; they do not invent their own composer shell.

### StatusPill

Purpose: queue, running, success, failure, commercial status.

Tones:

- `neutral`
- `queued`
- `running`
- `success`
- `error`
- `commercial`

Rules:

- Running uses lime.
- Success uses green.
- Error uses red.
- Commercial uses orange.
- Use low-alpha backgrounds, not large saturated blocks.

### SurfaceState

Purpose: empty, loading, error, success, info states.

Rules:

- Empty and upload states use dashed warm surfaces.
- Error states provide a recovery action when possible.
- Loading uses skeleton or spinner, not large lime backgrounds.
- Keep one primary next action.

### SkeletonBlock

Purpose: loading placeholders for lists, images, text.

Rules:

- Warm low-alpha surface.
- No blue or violet shimmer.

### Dialog, Modal, Drawer

Applies to auth, announcement, image preview, prompt editor, task drawer, and high-impact confirmations.

Minimum dialog contract:

- `role="dialog"`.
- `aria-modal="true"` for modal dialogs.
- `aria-labelledby` points to a visible title.
- Opening moves focus into the dialog.
- Closing restores focus to the trigger when possible.
- Escape closes non-destructive dialogs.
- Modal dialogs trap keyboard focus.
- Close button has an accessible label.

High-impact actions require blocking confirmation:

- Delete history records or task groups.
- Publish generated output publicly.
- Unpublish generated output.

Confirmation copy must include action object, impact scope, and consequence.

## Page Layout Rules

### App Shell

- Top nav is fixed, 64px high, warm charcoal, blurred.
- Desktop uses left side nav at 240px.
- Main content uses `pt-16 lg:pl-60`.
- Mobile uses bottom tab bar and reserves bottom padding.
- `/design-system` is not included in normal user navigation.

### Image Workbench

Used by create, workspace, explore, history, and favorites.

Rules:

- Generated or referenced images stay visually dominant.
- Controls sit in quiet surfaces.
- Hover overlays are readable but do not smother images.
- Primary action is cream.
- Running and selected state use lime.

### Prompt Composer

Rules:

- Outer surface owns the visual boundary.
- Prompt textarea does not need a heavy border.
- Parameter row uses compact fields.
- Upload entry uses icon button or dashed state surface.
- On mobile, input, upload, parameters, and submit action must remain reachable without horizontal overflow.

### Gallery Masonry

Rules:

- Cards have stable aspect ratios.
- Image fills the frame.
- Overlay actions are accessible on mobile and keyboard reachable.
- Favorite, preview, reuse, and download actions use icon or compact buttons.

### Task Lifecycle

Rules:

- Queued, running, succeeded, and failed states use StatusPill semantics.
- Failed tasks expose reason and next action.
- Running tasks show progress context without fake precision.
- Task center and task drawer share state language.

### Account And Admin Boundary

Ordinary user surfaces may say:

- AetherGenix account
- available balance / credits
- recharge
- refresh balance
- generation history
- favorites
- preferences
- site announcement

Ordinary user surfaces must not say:

- Sub2API
- API Key
- provider base URL
- auth base URL
- usage path
- upstream system
- test connection
- payment configuration
- finance center
- order center

Admin configuration may show technical integration terms.

## Responsive Rules

Breakpoints follow the app Tailwind defaults.

Mobile:

- 375px and 390px widths must not horizontally overflow.
- Tap targets should be at least 44px where actions are frequent or high impact.
- Bottom tab labels must truncate instead of wrapping.
- Dialogs and drawers must fit within viewport height.
- Long prompts, titles, and status messages must wrap.

Tablet:

- Composer actions remain reachable.
- Toolbars may wrap, but control heights remain stable.
- No content should hide under fixed nav.

Desktop:

- Content stays constrained and scannable.
- Side nav does not overlap main content.
- Workbench surfaces prefer grid layouts over oversized hero panels.

Fixed-format elements:

- Boards, image cards, icon toolbars, counters, thumbnails, tabs, and segmented controls need stable dimensions or aspect ratios.
- Hover, loading, labels, icons, and dynamic text must not shift layout.

## Accessibility Rules

- Color contrast must work in dark mode first.
- Focus visible uses lime ring or border.
- Every icon-only button has a label.
- Dialogs follow the dialog contract above.
- Keyboard users can open preview, select image, close modal, and trigger primary actions.
- Form labels are programmatically associated where practical.
- Errors are text-visible, not only color-coded.
- Reduced motion must remain possible.
- User-facing text must not overlap, truncate critical meaning, or overflow controls.

## Reuse Rules

Before developing a new page:

1. Read this file.
2. Inspect `src/design-system/preview/index.html`.
3. Inspect `src/components/design-system/`.
4. Choose an existing page pattern.
5. Build from existing primitives first.

Extend before creating:

- If a component is close, extend it with props, variants, slots, or class hooks.
- Create a new primitive only when no existing component can reasonably cover the responsibility and the pattern will recur.
- Any new primitive must update this file, the static preview, the React preview when relevant, and smoke checks if needed.
- Active production routes must be built from `src/components/design-system/` primitives before launch. Page-local buttons, icon buttons, form fields, cards, modals, drawers, status pills, and empty/loading/error states are launch blockers unless the page is explicitly legacy or redirect-only.
- Redirect-only legacy files such as the inactive `/ecommerce` implementation may remain historical until removed, but they must not be copied as new UI patterns.

Forbidden duplication:

- Page-local button systems.
- Page-local card systems.
- Page-local form systems.
- Page-local nav systems.
- Page-local status color systems.
- New cyan/violet primary visual recipes.

Raw value exceptions:

- Existing legacy surface during scoped migration.
- A supported visual exception documented here.
- A missing semantic token that is added in the same change.

## Preview Rules

Static preview:

- Path: `src/design-system/preview/index.html`.
- Pure HTML/CSS by default.
- May use small vanilla JavaScript for preview-only interactions.
- Does not depend on React, Vite, or app routing.
- Must display tokens, type, spacing, radius, shadows, buttons, inputs, cards, navigation, modal/drawer patterns, state surfaces, and responsive examples.
- Must stay compact and truthful to production UI.
- Must not become a marketing page.

React execution preview:

- Path: `src/pages/DesignSystem.tsx`.
- Route: `/design-system`.
- Shows how React primitives implement the static spec.
- Internal only; not in normal navigation.
- It is evidence, not canonical source.

## Verification Rules

Required local gates for design-system work:

```powershell
npm run lint
npm run build
npm run check:brand
npm run smoke:design-system
npm run test:account
```

Required viewport checks:

- Desktop: 1440x900 or 1366x768.
- Mobile: 390x844 or 375x812.

Acceptable UI quality means:

- Background reads as warm charcoal.
- Primary action reads as cream pill.
- Active, running, focus, and notification accents use lime.
- Commercial CTAs use orange.
- Errors use red.
- Images remain visually dominant.
- No mobile horizontal overflow.
- Text fits in buttons, tabs, cards, overlays, and nav items.
- Dialogs and drawers have clear close paths.
- Static preview and React preview show the same token and component language.

Reject if:

- Page is dominated by purple-blue gradients.
- Primary action is cyan/violet gradient.
- Lime is used as a large background field.
- Cards are nested as decorative layout structure.
- Text becomes unreadable over cream, lime, orange, or image overlays.
- Mobile tab labels wrap or overlap.
- A page invents a second local design system.

## Deprecated Historical Direction

The earlier Aether Fruit / cyan-violet cosmic / glass nebula direction is historical context only. Do not use it as the execution standard for new UI.

Deprecated for new UI:

- Cyan/violet primary CTA.
- Cyan/violet active navigation.
- Cyan/violet input focus.
- Cold blue cosmic background.
- Large glass nebula cards.
- Genesis gradient as product identity.

Compatibility-only:

- Existing legacy utility classes such as `.btn-*`, `.card-*`, and `.glow-*`.
- Existing old brand assets until a dedicated brand asset task replaces them.
- Legacy routes retained for redirects or historical evidence.

When touching legacy UI, migrate nearby active/focus/CTA styles toward Warm Charcoal without widening the diff unnecessarily.
