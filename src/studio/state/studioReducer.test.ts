import assert from 'node:assert/strict';
import { createInitialStudioState, createStudioId, studioReducer } from './studioReducer';
import type { StudioLayer } from './studioTypes';

const state = createInitialStudioState();
assert.equal(state.project.artboards.length, 1);

const renamed = studioReducer(state, { type: 'project.rename', name: 'Spring Campaign' });
assert.equal(renamed.project.name, 'Spring Campaign');
assert.equal(renamed.project.businessHistory[0].type, 'project.rename');

const withArtboard = studioReducer(renamed, { type: 'artboard.create', name: 'Result 1', width: 1200, height: 900 });
assert.equal(withArtboard.project.artboards.length, 2);
assert.equal(withArtboard.project.artboards[1].name, 'Result 1');
assert.equal(withArtboard.project.activeArtboardId, withArtboard.project.artboards[1].id);

const withAsset = studioReducer(withArtboard, {
  type: 'asset.add',
  asset: { id: 'asset-1', kind: 'uploaded-image', name: 'product.png', src: 'blob://product' },
});
assert.equal(withAsset.project.assets.length, 1);

const productLayer: StudioLayer = {
  id: createStudioId('layer'),
  type: 'product-image',
  artboardId: withAsset.project.activeArtboardId,
  name: 'product.png',
  visible: true,
  locked: false,
  assetId: 'asset-1',
};
const withLayer = studioReducer(withAsset, { type: 'layer.register', layer: productLayer });
assert.equal(withLayer.project.artboards[1].layerIds[0], productLayer.id);
assert.equal(withLayer.project.layers[productLayer.id].type, 'product-image');

const withTemplate = studioReducer(withLayer, { type: 'template.apply', templateId: 'hero', prompt: 'premium hero' });
assert.equal(withTemplate.project.artboards[1].generationSettings.prompt, 'premium hero');

const withResult = studioReducer(withTemplate, {
  type: 'generation.result.apply',
  asset: { id: 'asset-result', kind: 'generated-image', name: 'result.png', src: '/storage/result.png' },
  artboardName: 'Generated 1',
});
assert.equal(withResult.project.artboards.length, 3);
assert.equal(withResult.project.artboards[2].name, 'Generated 1');
assert.equal(withResult.project.assets[0].kind, 'generated-image');

console.log('ok - studioReducer');

