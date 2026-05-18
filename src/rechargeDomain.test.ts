import assert from 'node:assert/strict';
import { resolveExternalRechargeUrl } from './rechargeDomain';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

test('resolves external recharge URL from public settings first', () => {
  assert.equal(
    resolveExternalRechargeUrl({
      recharge_url: 'https://aether.example.com/recharge',
      upstream: {
        effective_recharge_url: 'https://admin.example.com/recharge',
      },
    }),
    'https://aether.example.com/recharge',
  );
});

test('falls back to effective admin recharge URL when public URL is empty', () => {
  assert.equal(
    resolveExternalRechargeUrl({
      recharge_url: '',
      upstream: {
        effective_recharge_url: 'https://admin.example.com/recharge',
      },
    }),
    'https://admin.example.com/recharge',
  );
});

test('rejects unsafe or missing recharge URLs', () => {
  assert.equal(resolveExternalRechargeUrl({ recharge_url: 'javascript:alert(1)' }), '');
  assert.equal(resolveExternalRechargeUrl({ recharge_url: 'ftp://example.com/recharge' }), '');
  assert.equal(resolveExternalRechargeUrl(null), '');
});
