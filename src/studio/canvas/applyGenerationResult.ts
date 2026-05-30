import {
  AssetRecordType,
  PageRecordType,
  createShapeId,
  toRichText,
  type Editor,
  type TLAssetId,
  type TLImageAsset,
  type TLPageId,
  type TLShapeId,
} from 'tldraw';
import type { StudioArtboard, StudioAsset } from '../state/studioTypes';

export function ensureTldrawPage(editor: Editor, artboard: StudioArtboard) {
  const pageId = artboard.tldrawPageId as TLPageId;
  if (!editor.getPage(pageId)) {
    editor.createPage({ id: pageId, name: artboard.name });
  }
  editor.setCurrentPage(pageId);
  return pageId;
}

function assetIdFor(asset: StudioAsset) {
  return AssetRecordType.createId(asset.id.replace(/[^a-zA-Z0-9_-]/g, '-'));
}

export function createOrUpdateImageAsset(editor: Editor, asset: StudioAsset): TLAssetId {
  const id = assetIdFor(asset);
  const width = asset.metadata?.width ?? 720;
  const height = asset.metadata?.height ?? 720;
  const imageAsset: TLImageAsset = {
    id,
    typeName: 'asset',
    type: 'image',
    props: {
      name: asset.name,
      src: asset.src,
      w: width,
      h: height,
      fileSize: asset.file?.size,
      mimeType: asset.metadata?.mimeType ?? asset.file?.type ?? 'image/png',
      isAnimated: false,
    },
    meta: {},
  };
  if (editor.getAsset(id)) {
    editor.updateAssets([imageAsset]);
  } else {
    editor.createAssets([imageAsset]);
  }
  return id;
}

export function insertImageAssetOnCanvas(
  editor: Editor,
  asset: StudioAsset,
  options: { x?: number; y?: number; maxWidth?: number; select?: boolean } = {},
): TLShapeId {
  const assetId = createOrUpdateImageAsset(editor, asset);
  const width = Math.min(asset.metadata?.width ?? 420, options.maxWidth ?? 420);
  const sourceWidth = asset.metadata?.width ?? width;
  const sourceHeight = asset.metadata?.height ?? width;
  const height = Math.max(120, Math.round((width / sourceWidth) * sourceHeight));
  const shapeId = createShapeId();

  editor.createShapes([
    {
      id: shapeId,
      type: 'image',
      x: options.x ?? 120,
      y: options.y ?? 120,
      props: {
        assetId,
        w: width,
        h: height,
        altText: asset.name,
      },
    },
  ]);
  if (options.select ?? true) editor.select(shapeId);
  return shapeId;
}

export function insertTextOnCanvas(editor: Editor, text = 'New text'): TLShapeId {
  const shapeId = createShapeId();
  editor.createShapes([
    {
      id: shapeId,
      type: 'text',
      x: 160,
      y: 160,
      props: {
        richText: toRichText(text),
        autoSize: false,
        w: 320,
      },
    },
  ]);
  editor.select(shapeId);
  return shapeId;
}

export function insertPromptBlockOnCanvas(editor: Editor, prompt: string): TLShapeId {
  const shapeId = createShapeId();
  editor.createShapes([
    {
      id: shapeId,
      type: 'note',
      x: 80,
      y: 80,
      props: {
        richText: toRichText(prompt.slice(0, 160) || 'Prompt block'),
      },
    },
  ]);
  editor.select(shapeId);
  return shapeId;
}

export function applyGenerationResult(editor: Editor, artboard: StudioArtboard, resultAsset: StudioAsset): TLShapeId {
  ensureTldrawPage(editor, artboard);
  return insertImageAssetOnCanvas(editor, resultAsset, { x: 96, y: 96, maxWidth: 640 });
}

export function createTldrawPageId(seed: string) {
  return PageRecordType.createId(seed.replace(/[^a-zA-Z0-9_-]/g, '-'));
}
