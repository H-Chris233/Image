import { SCENE_CATALOG } from '../../components/ecommerce/sceneCatalog';

export const scenePromptMap = Object.fromEntries(SCENE_CATALOG.map((scene) => [scene.sceneKey, scene.prompt]));

