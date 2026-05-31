export function SampleCard({ src, title, muted = false }: { src: string; title: string; muted?: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-surface">
      <img src={src} alt="" className={`h-full w-full object-cover ${muted ? 'opacity-55' : ''}`} />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold">
        {title}
      </span>
    </div>
  );
}
