import type { StudioArtboard, StudioLayer } from '../state/studioTypes';

export function InspectorPanel({
  artboard,
  selectedLayers,
  onPromptChange,
  onAspectRatioChange,
  onCountChange,
  onQualityChange,
}: {
  artboard: StudioArtboard;
  selectedLayers: StudioLayer[];
  onPromptChange: (prompt: string) => void;
  onAspectRatioChange: (aspectRatio: string) => void;
  onCountChange: (count: number) => void;
  onQualityChange: (quality: string) => void;
}) {
  return (
    <section className="min-h-0">
      <h2 className="text-sm font-bold">Inspector</h2>
      <div className="mt-3 rounded-lg border border-white/[0.08] p-3 text-xs text-on-surface-variant">
        <div className="truncate text-on-surface">{artboard.name}</div>
        <div className="mt-1">
          {artboard.width} x {artboard.height}
        </div>
        <div className="mt-1 truncate">
          {selectedLayers.length ? selectedLayers.map((layer) => layer.name).join(', ') : 'No layer selected'}
        </div>
      </div>

      <label className="mt-4 block text-xs font-semibold text-on-surface">Prompt</label>
      <textarea
        value={artboard.generationSettings.prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        className="mt-2 min-h-28 w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-on-surface outline-none focus:border-lime/70"
        placeholder="Describe scene, lighting, composition, and product style"
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <label className="text-xs font-semibold text-on-surface">
          Ratio
          <select
            value={artboard.generationSettings.aspectRatio}
            onChange={(event) => onAspectRatioChange(event.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-white/[0.08] bg-[#1a1917] px-2 text-xs text-on-surface"
          >
            <option value="1:1">1:1</option>
            <option value="4:5">4:5</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-on-surface">
          Count
          <input
            type="number"
            min={1}
            max={4}
            value={artboard.generationSettings.count}
            onChange={(event) => onCountChange(Number(event.target.value))}
            className="mt-2 h-9 w-full rounded-md border border-white/[0.08] bg-[#1a1917] px-2 text-xs text-on-surface"
          />
        </label>
        <label className="text-xs font-semibold text-on-surface">
          Quality
          <select
            value={artboard.generationSettings.quality}
            onChange={(event) => onQualityChange(event.target.value)}
            className="mt-2 h-9 w-full rounded-md border border-white/[0.08] bg-[#1a1917] px-2 text-xs text-on-surface"
          >
            <option value="auto">auto</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
      </div>
    </section>
  );
}

