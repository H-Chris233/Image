import type { ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import type { StudioAsset } from '../state/studioTypes';

export function AssetsPanel({
  assets,
  onAddAsset,
  onInsertAsset,
}: {
  assets: StudioAsset[];
  onAddAsset: (asset: StudioAsset) => void;
  onInsertAsset: (asset: StudioAsset) => void;
}) {
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const asset: StudioAsset = {
      id: `asset-${Date.now()}`,
      kind: 'uploaded-image',
      name: file.name || 'product image',
      src: URL.createObjectURL(file),
      file,
      metadata: { mimeType: file.type, role: 'product' },
    };
    onAddAsset(asset);
    event.target.value = '';
  }

  return (
    <section className="min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Assets</h2>
        <label className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/[0.08] text-on-surface-variant hover:bg-white/[0.06]">
          <ImagePlus size={16} aria-hidden="true" />
          <span className="sr-only">Upload asset</span>
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            title={`Insert ${asset.name}`}
            className="group overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] text-left hover:border-lime/70"
            onClick={() => onInsertAsset(asset)}
          >
            <img src={asset.src} alt={asset.name} className="aspect-square w-full object-cover" />
            <span className="block truncate px-2 py-1.5 text-[11px] text-on-surface-variant group-hover:text-on-surface">
              {asset.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

