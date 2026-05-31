const FALLBACK = '生成失败，请稍后重试。';

const CJK = /[一-鿿]/;

const PATTERNS: ReadonlyArray<{ test: RegExp; message: string }> = [
  { test: /rate.?limit|too many requests|429|频繁|限流/i, message: '当前生成排队人数较多，请稍后重试。' },
  { test: /insufficient|not enough|balance|余额|quota|欠费|额度/i, message: '算力余额不足，请充值后重试。' },
  { test: /401|403|unauthorized|forbidden|authentication|登录|未授权/i, message: '登录状态已过期，请重新登录后重试。' },
  {
    test: /connect|timeout|timed out|etimedout|econnreset|network|fetch failed|socket|502|503|504|网络/i,
    message: '网络连接不稳定，请稍后重试。',
  },
];

/**
 * Map a raw task/backend error into a seller-friendly Chinese message.
 * Raw codes like "ConnectError" or "Upstream rate limit exceeded, please retry later"
 * must never reach the UI. Already-localized friendly messages pass through unchanged.
 */
export function humanizeTaskError(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return FALLBACK;

  for (const { test, message } of PATTERNS) {
    if (test.test(value)) return message;
  }

  // Our own localized copy (Chinese, no recognized error signature) is already friendly.
  if (CJK.test(value)) return value;

  // Unknown English/ASCII backend error: never echo it.
  return FALLBACK;
}
