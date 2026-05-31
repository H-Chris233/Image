function extensionFromMime(mimeType: string) {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

export async function fileFromImageUrl(src: string, name: string) {
  const response = await fetch(src, { credentials: 'include' });
  if (!response.ok) throw new Error('无法读取历史图片，请重新上传或稍后再试');
  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';
  return new File([blob], `${name}.${extensionFromMime(mimeType)}`, { type: mimeType });
}
