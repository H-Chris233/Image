import { SCENE_CATALOG, customerLabel } from '../../components/ecommerce/sceneCatalog';
import type { StudioLocation } from '../app/studioLocation';
import { CREATE_TEMPLATES, templateById, type StudioCreateTemplate } from './createTemplates';

export function sceneTemplateFromLocation(location: StudioLocation): StudioCreateTemplate | null {
  const preset = location.composer?.preset as { customerKey?: unknown; sceneKey?: unknown } | undefined;
  if (typeof preset?.customerKey !== 'string' || typeof preset.sceneKey !== 'string') {
    return null;
  }

  const scene = SCENE_CATALOG.find((entry) => (
    entry.customerKey === preset.customerKey && entry.sceneKey === preset.sceneKey
  ));
  if (!scene) return null;

  const fallbackTemplate = templateForSceneKey(scene.sceneKey);
  return {
    ...fallbackTemplate,
    id: `${scene.customerKey}-${scene.sceneKey}`,
    title: scene.label,
    useCase: `${customerLabel(scene.customerKey)} · 场景参考`,
    previewImage: scene.sampleImage,
    promptTemplate: scene.prompt,
  };
}

export function templateFromLocation(location: StudioLocation, fallbackScenarioId?: string | null) {
  return (
    sceneTemplateFromLocation(location) ??
    templateById(location.t3?.id) ??
    CREATE_TEMPLATES.find((template) => template.scenario === fallbackScenarioId) ??
    CREATE_TEMPLATES[0]
  );
}

function templateForSceneKey(sceneKey: string): StudioCreateTemplate {
  if (sceneKey === 'white_bg') return templateById('ecommerce-white-bg') ?? CREATE_TEMPLATES[0];
  if (sceneKey === 'lifestyle') return templateById('ecommerce-scene') ?? CREATE_TEMPLATES[0];
  if (sceneKey === 'macro') return templateById('ecommerce-detail') ?? CREATE_TEMPLATES[0];
  if (sceneKey === 'poster') return templateById('ecommerce-ad') ?? CREATE_TEMPLATES[0];
  if (sceneKey === 'premium_hero' || sceneKey === 'on_model') return templateById('ecommerce-scene') ?? CREATE_TEMPLATES[0];
  return templateById('ecommerce-scene') ?? CREATE_TEMPLATES[0];
}
