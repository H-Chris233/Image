# Studio Rewrite

## Goal

```text
AetherGenix Image Studio
└─ Flair-like entry structure, AetherGenix-specific workflows
   ├─ inspiration
   ├─ create
   ├─ user
   ├─ redraw
   └─ assets
```

## Product Split

```text
Studio
├─ T0 Inspiration Surface
│  └─ /explore / left T1 nav / expert prompts / scene catalog
├─ T1 Left Nav
│  ├─ create
│  ├─ redraw
│  ├─ assets
│  ├─ inspiration
│  └─ user fixed bottom
├─ T2 Workspace Tabs
│  ├─ InspirationPanel
│  ├─ CreatePanel
│  ├─ UserPanel
│  ├─ RedrawPanel
│  └─ AssetsPanel
├─ T3 Detail Popovers
│  ├─ inspiration item actions
│  ├─ SMB workflow cards
│  ├─ image-2 scenario detail
│  └─ asset item actions
└─ T4 Execution Composer
   ├─ CreateComposer
   └─ RedrawComposer
```

```text
layout rule
├─ T1 stays fixed in left nav
├─ left nav does not expand T2
├─ T2 lives inside right workspace
├─ T2 uses tabs / columns / sections
├─ create uses workflow card columns
├─ assets uses gallery tabs
├─ redraw uses tool group tabs
├─ user uses visible account summary + preference sections
└─ T3 + T4 belong to the selected T2 workspace
```

## Route Policy

```text
routes
├─ /
│  ├─ Studio boot
│  ├─ waits auth + asset summary
│  ├─ keeps global account header
│  ├─ no legacy side nav
│  └─ auto announcement: off
├─ /explore
│  ├─ T0 marketing / inspiration
│  ├─ expert prompts / scene catalog
│  ├─ keeps global account header
│  ├─ uses Studio T1 left nav
│  └─ auto announcement: off
├─ /create/*
│  ├─ create shell
│  └─ keeps global account header
├─ /assets/*
│  ├─ asset library shell
│  └─ keeps global account header
├─ /redraw/*
│  ├─ redraw shell
│  └─ keeps global account header
├─ /user/*
│  ├─ user shell
│  └─ keeps global account header
└─ /studio/*
   ├─ compatibility shell
   └─ keeps global account header
```

## Entry Logic

```text
boot
├─ unauthenticated -> /explore
├─ authenticated + continue redraw -> /redraw
├─ authenticated + explicit T1 path -> that T1
├─ authenticated + no assets -> /create
└─ authenticated + assets -> /assets
```

## Source Tree

```text
src/studio/
├─ StudioPage.tsx
├─ app/
│  ├─ StudioApp.tsx
│  ├─ StudioBootstrap.tsx
│  ├─ studioEntryResolver.ts
│  ├─ studioIntent.ts
│  ├─ studioLocation.ts
│  ├─ studioDemoTree.ts
│  ├─ studioNav.ts
│  └─ studioRoutes.ts
├─ shell/
│  ├─ StudioShell.tsx
│  └─ LeftNav.tsx
├─ inspiration/
│  ├─ InspirationSurface.tsx
│  ├─ InspirationPanel.tsx
│  ├─ InspirationDetail.tsx
│  ├─ inspirationCatalog.ts
│  └─ useInspirationActions.ts
├─ create/
│  ├─ CreatePanel.tsx
│  ├─ CreateComposer.tsx
│  ├─ smbWorkflows.ts
│  ├─ sceneCatalogAdapter.ts
│  └─ createTypes.ts
├─ user/
│  ├─ UserPanel.tsx
│  ├─ AccountSummary.tsx
│  ├─ BalanceSummary.tsx
│  └─ userTypes.ts
├─ redraw/
│  ├─ RedrawPanel.tsx
│  ├─ RedrawComposer.tsx
│  ├─ RedrawScenarioDetail.tsx
│  ├─ image2Scenarios.ts
│  ├─ image2PromptBuilder.ts
│  └─ redrawTypes.ts
├─ assets/
│  ├─ AssetLibraryPanel.tsx
│  ├─ AssetImagePicker.tsx
│  ├─ assetAdapters.ts
│  ├─ useAssetLibrary.ts
│  ├─ useAssetSummary.ts
│  └─ assetTypes.ts
├─ generation/
│  ├─ image2Runner.ts
│  ├─ taskPolling.ts
│  ├─ generationTypes.ts
│  └─ resultAdapters.ts
├─ shared/
│  ├─ ImageDropzone.tsx
│  ├─ AspectRatioPicker.tsx
│  ├─ CountPicker.tsx
│  ├─ PromptTextarea.tsx
│  ├─ ResultGrid.tsx
│  └─ fileFromImageUrl.ts
└─ legacy-canvas/
   └─ kept only if canvas editor returns
```

## Ownership

```text
app/
└─ decides which T1 item is active

shell/
└─ layout only; no image-2 logic, no history fetching

inspiration/
└─ browse and convert inspiration into create/redraw input

create/
└─ new image generation workflows for SMB merchant needs

redraw/
└─ image-2 scene language, prompt templates, input image editing

assets/
└─ uploaded originals, generated results, redraw results, favorites, failed tasks

generation/
└─ API payload building, submit, task polling, result normalization

shared/
└─ stable UI primitives reused by create/redraw/assets
```

## Dependency Direction

```text
StudioPage
└─ app
   ├─ shell
   ├─ inspiration
   ├─ create
   ├─ user
   ├─ redraw
   └─ assets

feature modules
├─ may import shared
├─ may import generation
├─ may import api
└─ must not import sibling feature UI directly

allowed:
create -> generation
redraw -> generation
assets -> shared
redraw -> shared

not allowed:
create -> redraw UI
redraw -> create UI
assets -> redraw UI
shell -> generation
shell -> api
```

## Workflow Registry

```text
create/smbWorkflows.ts
└─ create workflows by merchant type
   ├─ id
   ├─ title
   ├─ merchantType
   ├─ requiredInputs
   ├─ defaultOutput
   └─ promptSeed

redraw/image2Scenarios.ts
└─ redraw scenarios by operation type
   ├─ id
   ├─ group
   ├─ title
   ├─ inputPolicy
   ├─ outputSpec
   └─ promptTemplate
```

## Change Rule

```text
Adding a merchant workflow
└─ edit create/smbWorkflows.ts
   └─ no shell/layout changes

Adding an image-2 redraw operation
└─ edit redraw/image2Scenarios.ts
   └─ no CreatePanel changes

Changing API polling
└─ edit generation/taskPolling.ts
   └─ no panel changes

Changing asset reuse
└─ edit assets/assetAdapters.ts
   └─ no redraw/create panel changes

Changing navigation shape
└─ edit app/studioNav.ts + shell/*
   └─ no generation changes
```

## Anti-Blob Rule

```text
No file should own more than one job:

bad:
ImageEditorShell.tsx
├─ fetch assets/history
├─ convert URL to File
├─ build prompts
├─ submit image-2
├─ poll task
├─ render scenario rail
├─ render upload area
├─ render prompt form
└─ render past generations

good:
RedrawComposer.tsx
├─ owns local form state
├─ calls image2Runner
└─ renders shared controls
```

## Refactor Order

```text
1. Split current ImageEditorShell helpers
   ├─ assets/useAssetLibrary.ts
   ├─ assets/assetAdapters.ts
   ├─ generation/taskPolling.ts
   ├─ shared/fileFromImageUrl.ts
   └─ redraw/image2PromptBuilder.ts

2. Split current ImageEditorShell UI
   ├─ redraw/RedrawPanel.tsx
   ├─ redraw/RedrawComposer.tsx
   ├─ assets/AssetImagePicker.tsx
   └─ shared/ImageDropzone.tsx

3. Add StudioApp + Shell
   ├─ app/StudioApp.tsx
   ├─ shell/StudioShell.tsx
   ├─ shell/StickyNav.tsx
   └─ shell/FloatingPanel.tsx

4. Move create entry
   ├─ create/CreatePanel.tsx
   ├─ create/CreateComposer.tsx
   └─ create/smbWorkflows.ts

5. Quarantine legacy canvas
   └─ move old tldraw files to legacy-canvas/
```

## Acceptance

```text
/explore opens T0 inspiration
/create opens the new shell
/studio remains compatibility entry
T1 production nav has create / redraw / assets / inspiration
user is fixed at bottom and expands upward
T2 opens by click, not long scroll
redraw uses image-2 scenario language
create uses SMB workflow language
assets can reuse images as inputs
generation logic is shared but UI is not coupled
no feature file becomes the single studio control center
```

## Motion Contract

```text
Motion is part of the design system, not page decoration.
Reference: Apple HIG motion principles.

T0 entry
├─ StickyMorphHeader
├─ ds-sticky-morph-* uses CSS scroll-state
└─ nav morphs only when browser reports stuck: top

T1/T2 navigation
├─ MotionTreeNav
├─ T1 sections stay mounted
├─ T2 expands with CSS grid rows
├─ user section is bottom-pinned
├─ icon scale, background, chevron, and child reveal move together
└─ no JS scroll listeners or animation library

T3 detail
├─ WorkbenchCard opens selection
├─ WorkbenchDetailPanel explains selected item
└─ ds-panel-enter

T4 composer
├─ WorkbenchComposerPanel owns execution shell
└─ ds-panel-enter

T3 cards
├─ WorkbenchCard
└─ ds-motion-card
```

```text
Rules
├─ reusable motion lives in src/components/design-system and ds-* classes
├─ feature modules consume design-system motion only
├─ T3/T4 structure comes from WorkbenchCard/DetailPanel/ComposerPanel
├─ no per-feature bespoke animation system
├─ no layout-shifting animation for fixed panels
├─ motion must show hierarchy or cause/effect
├─ keep transitions short, subtle, and reversible
└─ respect prefers-reduced-motion
```
