# Studio Rewrite

## Scope

```text
AetherGenix Image
└─ Creation UX rewrite
   ├─ New home: /studio
   ├─ Cutover: /create -> /studio
   ├─ Replace: /workspace/:taskId result review path
   └─ Quarantine old create/workspace business UI
```

## Decisions

```text
Canvas
└─ tldraw SDK

Shell
└─ Custom AetherGenix Studio Shell from V1

Model
├─ Project
├─ Artboards
├─ Assets
├─ Layers
└─ History

Reuse
├─ src/components/design-system/*
├─ src/api.ts
├─ auth/account/balance plumbing
├─ existing generation/task APIs
└─ scene prompt assets where useful

Do not reuse
├─ old CreateFlowWizard business flow
├─ old CreateHero flow entry
├─ old ResultView result UX
└─ old Workspace review UX
```

## Source Tree

```text
src/studio/
├─ StudioPage.tsx
├─ StudioShell.tsx
├─ state/
│  ├─ studioTypes.ts
│  ├─ studioActions.ts
│  ├─ studioReducer.ts
│  └─ history.ts
├─ canvas/
│  ├─ StudioCanvas.tsx
│  ├─ tldrawComponents.tsx
│  ├─ readCanvasContext.ts
│  ├─ applyGenerationResult.ts
│  └─ exportArtboard.ts
├─ panels/
│  ├─ AssetsPanel.tsx
│  ├─ TemplatesPanel.tsx
│  ├─ LayersPanel.tsx
│  └─ InspectorPanel.tsx
├─ generation/
│  ├─ buildGenerationRequest.ts
│  └─ StudioGenerateButton.tsx
└─ templates/
   ├─ templateCatalog.ts
   └─ scenePromptMap.ts
```

## Shell Tree

```text
StudioShell
├─ Topbar
│  ├─ project name
│  ├─ undo / redo
│  ├─ export
│  └─ generate
├─ Left rail
│  ├─ assets
│  ├─ templates
│  ├─ text
│  └─ generate
├─ Left panel
│  ├─ uploaded assets
│  ├─ generated assets
│  └─ templates
├─ Center
│  └─ StudioCanvas(tldraw)
├─ Right panel
│  ├─ inspector
│  ├─ prompt / scene
│  ├─ output settings
│  └─ layers
└─ Bottom strip
   └─ artboards
```

## Data Model

```text
StudioProject
├─ id
├─ name
├─ activeArtboardId
├─ selectedLayerIds[]
├─ assets[]
├─ artboards[]
└─ businessHistory[]

Artboard
├─ id
├─ name
├─ width
├─ height
├─ background
├─ tldrawPageId
└─ generationSettings

Asset
├─ id
├─ kind: uploaded-image | generated-image | template-resource
├─ name
├─ src
└─ metadata

Layer
├─ ImageLayer
│  ├─ ProductImageLayer
│  └─ GeneratedImageLayer
├─ TextLayer
├─ ShapeLayer
├─ TemplateSlotLayer
├─ PromptBlockLayer
└─ GroupLayer
```

## Ownership

```text
tldraw history
├─ create / delete shape
├─ move / resize / rotate
├─ text edit
├─ group / ungroup
├─ z-order
└─ selection

Studio history
├─ project.rename
├─ artboard.create / delete / switch
├─ asset.upload / remove / insert
├─ template.apply
├─ generation.settings.update
├─ generation.submit
├─ generation.result.apply
├─ draft.save
└─ draft.restore
```

## Generation Flow

```text
Generate
└─ StudioGenerateButton
   ├─ readCanvasContext(editor, project)
   │  ├─ active artboard
   │  ├─ primary product image
   │  ├─ prompt blocks
   │  ├─ scene/settings
   │  └─ reference images
   ├─ buildGenerationRequest(context)
   ├─ generateEcommerceImages(payload, images)
   ├─ track task
   └─ on success
      ├─ add generated asset
      ├─ create new artboard
      └─ insert GeneratedImageLayer
```

## V1 Acceptance

```text
/studio opens custom Studio Shell
tldraw powers center canvas
upload asset -> insert image layer
add text layer
create/switch multiple artboards
canvas undo/redo works
generation submits via existing API
generation result creates a new artboard
/create is no longer the new UX home
old create/workspace UI remains quarantined
```

