import assert from 'node:assert/strict';
import {
  createInitialWizardState,
  selectedTemplate,
  canContinueFromRecommend,
  wizardReducer,
} from './createWizardState';
import type { EcommerceAnalyzeResponse, RecommendedTemplate } from '../../api';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const template: RecommendedTemplate = {
  id: 'template-clean-hero',
  title: 'Clean Hero Shot',
  prompt: 'Clean white product hero prompt',
  image_url: 'https://example.com/template-clean.jpg',
  section: 'ecommerce',
  smb_categories: ['cross-border'],
  product_categories: ['skincare'],
  style_tags: ['clean', 'premium'],
  default_aspect_ratio: '4:3',
  default_size: '1536x1024',
  curator_note: '白底高质感主图',
};

const analyzeResponse: EcommerceAnalyzeResponse = {
  analysis: { product_type: 'skincare bottle' },
  reference_notes: [],
  model: 'smoke-model',
  form: {
    product_name: '',
    materials: '',
    selling_points: '',
    scenarios: '',
    platform: '',
    style: '',
    extra_requirements: '',
    image_count: 1,
  },
  plans: [],
  recommended_templates: [template],
};

test('initial state starts on upload_brief', () => {
  const state = createInitialWizardState();

  assert.equal(state.step, 'upload_brief');
  assert.equal(state.productImage, null);
  assert.equal(state.brief, '');
  assert.equal(state.analyzeResponse, null);
  assert.equal(state.selectedTemplateId, null);
  assert.equal(state.aspectRatio, '1:1');
  assert.equal(state.imageCount, 1);
});

test('successful analyze moves from upload_brief to recommend with response populated', () => {
  const file = new File(['image'], 'product.webp', { type: 'image/webp' });
  const state = wizardReducer(createInitialWizardState(), { type: 'set_product_image', file });
  const withBrief = wizardReducer(state, { type: 'set_brief', brief: '更突出保湿卖点' });
  const analyzed = wizardReducer(withBrief, { type: 'analyze_success', response: analyzeResponse });

  assert.equal(analyzed.step, 'recommend');
  assert.equal(analyzed.productImage, file);
  assert.equal(analyzed.brief, '更突出保湿卖点');
  assert.deepEqual(analyzed.analyzeResponse, analyzeResponse);
});

test('selecting a card enables recommend next action', () => {
  const analyzed = wizardReducer(createInitialWizardState(), { type: 'analyze_success', response: analyzeResponse });
  const selected = wizardReducer(analyzed, { type: 'select_template', templateId: template.id });

  assert.equal(selected.selectedTemplateId, template.id);
  assert.equal(canContinueFromRecommend(selected), true);
  assert.deepEqual(selectedTemplate(selected), template);
});

test('next from recommend enters tune and adopts selected template default aspect ratio', () => {
  const analyzed = wizardReducer(createInitialWizardState(), { type: 'analyze_success', response: analyzeResponse });
  const selected = wizardReducer(analyzed, { type: 'select_template', templateId: template.id });
  const tuned = wizardReducer(selected, { type: 'next_from_recommend' });

  assert.equal(tuned.step, 'tune');
  assert.equal(tuned.aspectRatio, '4:3');
  assert.equal(tuned.imageCount, 1);
});
