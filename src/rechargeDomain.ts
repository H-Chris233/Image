export type ExternalRechargeUrlInput = {
  recharge_url?: string | null;
  upstream?: {
    effective_recharge_url?: string | null;
  } | null;
} | null | undefined;

export function resolveExternalRechargeUrl(settings: ExternalRechargeUrlInput): string {
  return (
    normalizeExternalRechargeUrl(settings?.recharge_url) ||
    normalizeExternalRechargeUrl(settings?.upstream?.effective_recharge_url)
  );
}

function normalizeExternalRechargeUrl(value: string | null | undefined): string {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  try {
    const parsed = new URL(text);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? text : '';
  } catch {
    return '';
  }
}
