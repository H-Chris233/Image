import type { EcommerceGeneratePayload, EcommerceReferenceImage } from '../../api';

export type StudioGenerationContext = {
  prompt: string;
  aspectRatio: string;
  count: number;
  quality: string;
  productImage: File;
  referenceImages?: { file: File; role?: string; note?: string }[];
};

export function clampGenerationCount(count: number) {
  if (!Number.isFinite(count)) return 1;
  return Math.max(1, Math.min(4, Math.round(count)));
}

export function buildGenerationRequest(context: StudioGenerationContext): {
  payload: EcommerceGeneratePayload;
  images: EcommerceReferenceImage[];
} {
  const images: EcommerceReferenceImage[] = [
    { file: context.productImage, primary: true, role: 'product', note: 'Primary product image' },
    ...(context.referenceImages ?? []).map((reference) => ({
      file: reference.file,
      primary: false,
      role: reference.role ?? 'reference',
      note: reference.note ?? '',
    })),
  ];

  return {
    payload: {
      style: context.prompt,
      aspect_ratio: context.aspectRatio,
      quality: context.quality,
      n: clampGenerationCount(context.count),
    },
    images,
  };
}

