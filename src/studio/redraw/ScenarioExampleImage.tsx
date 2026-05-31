export function ScenarioExampleImage({ label, src }: { label: string; src: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-bold uppercase text-white/80">
        {label}
      </span>
    </div>
  );
}
