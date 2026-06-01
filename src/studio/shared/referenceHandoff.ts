const REFERENCE_KEY = 'aethergenix_studio_reference_asset';

export type ReferenceHandoff = {
  id: string;
  src: string;
  title: string;
  prompt?: string;
};

export function setReferenceHandoff(asset: ReferenceHandoff): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(REFERENCE_KEY, JSON.stringify(asset));
  } catch {
    // Session storage is a convenience handoff, not a required persistence layer.
  }
}

export function takeReferenceHandoff(): ReferenceHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(REFERENCE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(REFERENCE_KEY);
    const parsed = JSON.parse(raw) as Partial<ReferenceHandoff> | null;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.src === 'string') {
      return {
        id: parsed.id,
        src: parsed.src,
        title: typeof parsed.title === 'string' ? parsed.title : '参考图',
        prompt: typeof parsed.prompt === 'string' ? parsed.prompt : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
