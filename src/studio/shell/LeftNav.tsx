import { Images, Library, Sparkles, User, WandSparkles } from 'lucide-react';
import type { StudioLocation, StudioT1 } from '../app/studioLocation';
import { defaultT2, STUDIO_NAV } from '../app/studioNav';

const icons: Record<StudioT1, typeof Sparkles> = {
  create: Sparkles,
  redraw: WandSparkles,
  assets: Library,
  inspiration: Images,
  user: User,
};

export function LeftNav({
  location,
  onChange,
}: {
  location: StudioLocation;
  onChange: (next: StudioLocation) => void;
}) {
  const mainItems = STUDIO_NAV.filter((item) => item.id !== 'user');
  const userItems = STUDIO_NAV.filter((item) => item.id === 'user');

  function renderT1Item(item: (typeof STUDIO_NAV)[number]) {
    const Icon = icons[item.id];
    const active = location.t1 === item.id;

    return (
      <button
        key={item.id}
        type="button"
        aria-current={active ? 'page' : undefined}
        className={`ds-motion-press flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm font-semibold transition ${
          active
            ? 'border-lime/35 bg-lime/12 text-lime'
            : 'border-transparent text-[#b7b1a8] hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-[#f4f0ea]'
        }`}
        onClick={() =>
          onChange({
            surface: 'studio',
            t1: item.id,
            t2: defaultT2(item.id),
            t3: null,
            composer: null,
          })
        }
      >
        <Icon size={17} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <aside className="ds-motion-tree-shell relative z-30 flex min-h-0 w-72 shrink-0 flex-col border-r border-white/[0.08] max-lg:w-64 max-md:hidden">
      <nav className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="主导航">
        <div className="space-y-1.5">{mainItems.map(renderT1Item)}</div>
      </nav>

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <div className="space-y-1.5">{userItems.map(renderT1Item)}</div>
      </div>
    </aside>
  );
}
