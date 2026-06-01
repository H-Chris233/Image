// 单一事实来源：把任何生成失败的原始错误翻译成给用户看的中文人话。
// 铁律：渲染层只用这里的返回值，绝不直接渲染 task.error / Error.message。
// 原因：上游(sub2api)报错形如 "Sub2API 上游请求失败：ConnectError" / Cloudflare 530 / HTTP 502，
// 非技术卖家看到会以为产品坏了 / 被骗 → 退款流失。

export interface PresentedError {
  /** 失败卡标题，始终人话。 */
  title: string;
  /** 一句话原因，始终人话，永不含内部串。 */
  message: string;
  /** 原始技术细节，仅供「详情」折叠或 admin 调试；默认不展示给普通用户。 */
  detail: string;
}

const DEFAULT_TITLE = '这次没生成成功';

// 命中即归类为「服务繁忙」——上游连接/网关/超时类，全是"稍后重试"。
const BUSY_PATTERNS = [
  'connecterror',
  'sub2api',
  'cloudflare',
  'tunnel',
  'timeout',
  'timed out',
  'connection',
  'econn',
  'gateway',
  'bad gateway',
  'service unavailable',
  'temporarily unavailable',
  '上游',
  '暂时不可用',
  '530',
  '502',
  '503',
  '504',
];

// 余额/计费类。
const BALANCE_PATTERNS = ['insufficient', 'balance', '余额', 'quota', '402', 'billing'];

// 内容安全/政策类。
const POLICY_PATTERNS = ['policy', 'safety', 'moderation', 'content_policy', '违规', '敏感', 'nsfw'];

function rawText(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const anyErr = error as Record<string, unknown>;
    const candidate = anyErr.message ?? anyErr.error ?? anyErr.detail;
    if (typeof candidate === 'string') return candidate;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function matches(haystack: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => haystack.includes(p));
}

/**
 * 把原始失败错误翻译成给用户看的 {title, message, detail}。
 * @param error 原始错误（task.error / Error / 任意）
 */
export function presentTaskError(error: unknown): PresentedError {
  const raw = rawText(error).trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return { title: DEFAULT_TITLE, message: '出图服务暂不可用，请稍后重试。', detail: '' };
  }
  if (matches(lower, BALANCE_PATTERNS)) {
    return { title: '余额不足', message: '账户余额不足，充值后即可继续生成。', detail: raw };
  }
  if (matches(lower, POLICY_PATTERNS)) {
    return { title: DEFAULT_TITLE, message: '这张图可能不符合生成规则，换一张商品图或调整描述后再试。', detail: raw };
  }
  if (matches(lower, BUSY_PATTERNS)) {
    return { title: DEFAULT_TITLE, message: '出图服务繁忙，请稍后重试。', detail: raw };
  }
  // 兜底：未识别也绝不暴露原文给用户，只进 detail。
  return { title: DEFAULT_TITLE, message: '生成没成功，请重试。', detail: raw };
}

/** 便捷：只取一句人话（toast / 单行场景用）。 */
export function presentTaskErrorMessage(error: unknown): string {
  return presentTaskError(error).message;
}
