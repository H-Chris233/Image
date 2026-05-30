export type StudioAssetKind = 'uploaded-image' | 'generated-image' | 'template-resource';

export type StudioAsset = {
  id: string;
  kind: StudioAssetKind;
  name: string;
  src: string;
  file?: File;
  metadata?: {
    width?: number;
    height?: number;
    mimeType?: string;
    taskId?: string;
    role?: string;
  };
};

export type GenerationSettings = {
  sceneId: string | null;
  prompt: string;
  aspectRatio: string;
  count: number;
  quality: string;
};

export type StudioArtboard = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  tldrawPageId: string;
  generationSettings: GenerationSettings;
  layerIds: string[];
};

export type StudioLayerBase = {
  id: string;
  artboardId: string;
  name: string;
  visible: boolean;
  locked: boolean;
  tldrawShapeId?: string;
};

export type ProductImageLayer = StudioLayerBase & {
  type: 'product-image';
  assetId: string;
};

export type GeneratedImageLayer = StudioLayerBase & {
  type: 'generated-image';
  assetId: string;
  taskId?: string;
};

export type TextLayer = StudioLayerBase & {
  type: 'text';
  text: string;
};

export type ShapeLayer = StudioLayerBase & {
  type: 'shape';
  shapeKind: 'rectangle' | 'ellipse' | 'line';
};

export type TemplateSlotLayer = StudioLayerBase & {
  type: 'template-slot';
  slotName: string;
};

export type PromptBlockLayer = StudioLayerBase & {
  type: 'prompt-block';
  prompt: string;
};

export type GroupLayer = StudioLayerBase & {
  type: 'group';
  childLayerIds: string[];
};

export type StudioLayer =
  | ProductImageLayer
  | GeneratedImageLayer
  | TextLayer
  | ShapeLayer
  | TemplateSlotLayer
  | PromptBlockLayer
  | GroupLayer;

export type StudioBusinessHistoryEntry = {
  id: string;
  type: string;
  at: string;
};

export type StudioProject = {
  id: string;
  name: string;
  activeArtboardId: string;
  selectedLayerIds: string[];
  assets: StudioAsset[];
  artboards: StudioArtboard[];
  layers: Record<string, StudioLayer>;
  businessHistory: StudioBusinessHistoryEntry[];
  activeTaskId: string | null;
};

export type StudioState = {
  project: StudioProject;
};

