import type { StudioArtboard, StudioLayer } from '../state/studioTypes';

export function LayersPanel({
  artboard,
  layers,
  selectedLayerIds,
  onSelectLayer,
}: {
  artboard: StudioArtboard;
  layers: Record<string, StudioLayer>;
  selectedLayerIds: string[];
  onSelectLayer: (id: string) => void;
}) {
  const artboardLayers = artboard.layerIds.map((id) => layers[id]).filter(Boolean);

  return (
    <section className="mt-5 min-h-0">
      <h2 className="text-sm font-bold">Layers</h2>
      <div className="mt-3 space-y-1">
        {artboardLayers.length === 0 ? (
          <div className="rounded-lg border border-white/[0.08] p-3 text-xs text-on-surface-variant">No layers</div>
        ) : (
          artboardLayers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-md border px-2 py-2 text-left text-xs ${
                selectedLayerIds.includes(layer.id)
                  ? 'border-lime/80 bg-lime/10 text-on-surface'
                  : 'border-white/[0.08] bg-white/[0.03] text-on-surface-variant'
              }`}
              onClick={() => onSelectLayer(layer.id)}
            >
              <span className="truncate">{layer.name}</span>
              <span className="ml-2 shrink-0 text-[10px] uppercase">{layer.type}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

