import assert from 'node:assert/strict';
import { buildGenerationRequest, clampGenerationCount } from './buildGenerationRequest';

const productImage = new File(['x'], 'product.png', { type: 'image/png' });
const referenceImage = new File(['y'], 'ref.png', { type: 'image/png' });
const request = buildGenerationRequest({
  prompt: 'clean product hero',
  aspectRatio: '1:1',
  count: 7,
  quality: 'auto',
  productImage,
  referenceImages: [{ file: referenceImage, role: 'style', note: 'soft daylight' }],
});

assert.equal(request.payload.style, 'clean product hero');
assert.equal(request.payload.aspect_ratio, '1:1');
assert.equal(request.payload.n, 4);
assert.equal(request.images[0].primary, true);
assert.equal(request.images[1].role, 'style');
assert.equal(clampGenerationCount(0), 1);
assert.equal(clampGenerationCount(2.4), 2);

console.log('ok - buildGenerationRequest');

