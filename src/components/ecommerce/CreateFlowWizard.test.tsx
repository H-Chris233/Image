import assert from 'node:assert/strict';
import {
  canContinueFromUpload,
  createInitialWizardState,
  wizardReducer,
} from './createWizardState';
import type { SceneTemplate } from './sceneCatalog';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const template: SceneTemplate = {
  customerKey: 'domestic_ecommerce',
  sceneKey: 'white_bg',
  label: '白底主图',
  prompt: 'Clean white product hero prompt',
  sampleImage: '/storage/inspirations/example.jpg',
};

test('initial state starts on browse', () => {
  const state = createInitialWizardState();

  assert.equal(state.step, 'browse');
  assert.equal(state.selectedTemplate, null);
  assert.equal(state.productImage, null);
  assert.equal(state.brief, '');
  assert.equal(state.aspectRatio, '1:1');
  assert.equal(state.imageCount, 1);
});

test('initial state can start with a selected template', () => {
  const state = createInitialWizardState({ selectedTemplate: template, initialBrief: 'Use this scene' });

  assert.equal(state.step, 'upload');
  assert.deepEqual(state.selectedTemplate, template);
  assert.equal(state.brief, 'Use this scene');
});

test('selecting a template advances from browse to upload', () => {
  const state = wizardReducer(createInitialWizardState(), { type: 'select_template', template });

  assert.equal(state.step, 'upload');
  assert.deepEqual(state.selectedTemplate, template);
});

test('upload step requires a product image before continuing', () => {
  const selected = wizardReducer(createInitialWizardState(), { type: 'select_template', template });
  assert.equal(canContinueFromUpload(selected), false);

  const file = new File(['image'], 'product.webp', { type: 'image/webp' });
  const withImage = wizardReducer(selected, { type: 'set_product_image', file });
  assert.equal(canContinueFromUpload(withImage), true);

  // 无图时不应进入 tune
  assert.equal(wizardReducer(selected, { type: 'next_from_upload' }).step, 'upload');
});

test('next from upload enters tune once an image is present', () => {
  const file = new File(['image'], 'product.webp', { type: 'image/webp' });
  const selected = wizardReducer(createInitialWizardState(), { type: 'select_template', template });
  const withImage = wizardReducer(selected, { type: 'set_product_image', file });
  const tuned = wizardReducer(withImage, { type: 'next_from_upload' });

  assert.equal(tuned.step, 'tune');
  assert.equal(tuned.productImage, file);
});

test('back navigates tune -> upload -> browse', () => {
  const file = new File(['image'], 'product.webp', { type: 'image/webp' });
  let state = wizardReducer(createInitialWizardState(), { type: 'select_template', template });
  state = wizardReducer(state, { type: 'set_product_image', file });
  state = wizardReducer(state, { type: 'next_from_upload' });
  assert.equal(state.step, 'tune');

  state = wizardReducer(state, { type: 'back' });
  assert.equal(state.step, 'upload');

  state = wizardReducer(state, { type: 'back' });
  assert.equal(state.step, 'browse');
  // 返回浏览仍保留已选模板，可重选
  assert.deepEqual(state.selectedTemplate, template);
});
