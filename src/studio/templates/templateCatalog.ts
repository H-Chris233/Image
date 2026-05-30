import { SCENE_CATALOG } from '../../components/ecommerce/sceneCatalog';

export type StudioTemplate = {
  id: string;
  title: string;
  prompt: string;
  sampleImage: string;
  aspectRatio: string;
};

export const templateCatalog: StudioTemplate[] = SCENE_CATALOG.slice(0, 8).map((scene) => ({
  id: `${scene.customerKey}-${scene.sceneKey}`,
  title: scene.label,
  prompt: scene.prompt,
  sampleImage: scene.sampleImage,
  aspectRatio: '1:1',
}));

