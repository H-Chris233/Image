import assert from 'node:assert/strict';
import { humanizeTaskError } from './errorMessages';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

test('maps upstream rate limit to a queue message', () => {
  assert.equal(
    humanizeTaskError('Upstream rate limit exceeded, please retry later'),
    '当前生成排队人数较多，请稍后重试。',
  );
  assert.equal(humanizeTaskError('HTTP 429 Too Many Requests'), '当前生成排队人数较多，请稍后重试。');
});

test('maps connection/timeout errors to a network message', () => {
  assert.equal(humanizeTaskError('ConnectError'), '网络连接不稳定，请稍后重试。');
  assert.equal(humanizeTaskError('request timed out (ETIMEDOUT)'), '网络连接不稳定，请稍后重试。');
  assert.equal(humanizeTaskError('502 Bad Gateway'), '网络连接不稳定，请稍后重试。');
});

test('maps balance errors to a recharge message', () => {
  assert.equal(humanizeTaskError('insufficient balance'), '算力余额不足，请充值后重试。');
  assert.equal(humanizeTaskError('余额不足'), '算力余额不足，请充值后重试。');
});

test('maps auth errors to a re-login message', () => {
  assert.equal(humanizeTaskError('401 Unauthorized'), '登录状态已过期，请重新登录后重试。');
});

test('passes through already-localized friendly messages', () => {
  assert.equal(humanizeTaskError('任务已完成，但没有可显示的结果图。'), '任务已完成，但没有可显示的结果图。');
  assert.equal(humanizeTaskError('生成失败。'), '生成失败。');
});

test('never echoes unknown English/ASCII errors', () => {
  assert.equal(humanizeTaskError('TypeError: cannot read properties of undefined'), '生成失败，请稍后重试。');
  assert.equal(humanizeTaskError(''), '生成失败，请稍后重试。');
  assert.equal(humanizeTaskError(null), '生成失败，请稍后重试。');
  assert.equal(humanizeTaskError(undefined), '生成失败，请稍后重试。');
});
