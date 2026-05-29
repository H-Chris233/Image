export const LAST_PRODUCT_IMAGE_KEY = 'aethergenix_last_product_image';

type StoredProductImage = {
  name: string;
  type: string;
  dataUrl: string;
  lastModified: number;
};

export async function storeLastProductImage(file: File) {
  const dataUrl = await readAsDataUrl(file);
  const payload: StoredProductImage = {
    name: file.name || 'product-image',
    type: file.type || 'image/png',
    dataUrl,
    lastModified: file.lastModified || Date.now(),
  };
  window.sessionStorage.setItem(LAST_PRODUCT_IMAGE_KEY, JSON.stringify(payload));
}

export async function readLastProductImage() {
  const raw = window.sessionStorage.getItem(LAST_PRODUCT_IMAGE_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as Partial<StoredProductImage>;
    if (!payload.dataUrl) return null;
    const response = await fetch(payload.dataUrl);
    const blob = await response.blob();
    const type = payload.type || blob.type || 'image/png';
    return new File([blob], payload.name || `product-image.${extensionForType(type)}`, {
      type,
      lastModified: payload.lastModified || Date.now(),
    });
  } catch {
    return null;
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error || new Error('Failed to read product image')));
    reader.readAsDataURL(file);
  });
}

function extensionForType(type: string) {
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  return 'png';
}
