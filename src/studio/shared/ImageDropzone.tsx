import type { ChangeEvent, DragEvent } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';

export function ImageDropzone({
  label,
  dragging,
  previewUrl,
  fileName,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  className = 'min-h-64',
}: {
  label: string;
  dragging: boolean;
  previewUrl: string;
  fileName?: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  className?: string;
}) {
  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center transition ${className} ${
        dragging ? 'border-lime bg-lime/10' : 'border-white/[0.12] bg-surface-dim hover:border-white/[0.22]'
      }`}
    >
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
      {previewUrl ? (
        <span className="flex h-full w-full flex-col">
          <img src={previewUrl} alt="" className="min-h-0 flex-1 object-contain p-3" />
          <span className="flex items-center gap-2 border-t border-white/[0.08] px-3 py-2 text-xs text-on-surface-variant">
            <CheckCircle2 size={14} className="text-lime" aria-hidden="true" />
            <span className="truncate">{fileName}</span>
          </span>
        </span>
      ) : (
        <span className="p-4">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-lime/20 bg-lime/10 text-lime">
            <Upload size={22} aria-hidden="true" />
          </span>
          <span className="mt-4 block text-sm font-bold text-on-surface">{label}</span>
          <span className="mt-1 block text-xs text-on-surface-variant">PNG / JPEG / WEBP</span>
        </span>
      )}
    </label>
  );
}
