import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Pressable, Surface } from '../design-system';
import { CUSTOMERS, scenesOf, type SceneTemplate } from './sceneCatalog';

interface Props {
  onPick: (scene: SceneTemplate) => void;
}

// 两级浏览：左栏客户类型 → 右栏该客户【专属】场景卡。点卡即选中该场景，进入上传。
export function SceneBrowser({ onPick }: Props) {
  const [activeCustomer, setActiveCustomer] = useState<string>(CUSTOMERS[0].key);
  const scenes = scenesOf(activeCustomer);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold text-on-surface">想做哪种图？</h2>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">先选你的生意类型，再挑一个场景，点选后上传商品图即可生成。</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="客户类型" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {CUSTOMERS.map((customer) => {
            const active = customer.key === activeCustomer;
            return (
              <button
                key={customer.key}
                type="button"
                onClick={() => setActiveCustomer(customer.key)}
                aria-pressed={active}
                className={[
                  'flex w-48 shrink-0 flex-col gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors lg:w-auto lg:shrink',
                  active
                    ? 'border-[#E3FF74]/60 bg-[#E3FF74]/10'
                    : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.2] hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <span className={`text-sm font-semibold ${active ? 'text-[#E3FF74]' : 'text-on-surface'}`}>
                  {customer.label}
                </span>
                <span className="truncate text-[11px] leading-4 text-on-surface-variant">{customer.tagline}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {scenes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {scenes.map((scene) => (
                <SceneCard key={`${scene.customerKey}-${scene.sceneKey}`} scene={scene} onClick={() => onPick(scene)} />
              ))}
            </div>
          ) : (
            <Surface tone="dashed" padding="lg" className="text-center">
              <p className="text-sm leading-6 text-on-surface-variant">该类型场景正在补充中，稍后再来看看。</p>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}

function SceneCard({ scene, onClick }: { key?: string; scene: SceneTemplate; onClick: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#111110] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E3FF74]/40 hover:bg-[#171613] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#1a1917]">
        {scene.sampleImage ? (
          <img
            src={scene.sampleImage}
            alt={scene.label}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-on-surface-variant">
            <ImagePlus aria-hidden="true" size={22} className="text-[#E3FF74]/70" />
            <span className="text-[11px] font-medium">示意图即将上线</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-[#f0ede8]">{scene.label}</h3>
        <span className="shrink-0 text-[11px] font-semibold text-[#E3FF74] opacity-0 transition-opacity group-hover:opacity-100">
          使用 →
        </span>
      </div>
    </Pressable>
  );
}
