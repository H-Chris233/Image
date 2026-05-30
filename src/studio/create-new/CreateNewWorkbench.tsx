import { Brush, Expand, Image, Images, PackagePlus, RotateCw, Sparkles, WandSparkles, Zap } from 'lucide-react';
import { IMAGE2_SCENARIOS, groupedScenarios, type Image2Scenario } from '../image-editor/operations/image2Scenarios';

export type StudioStartPreset = {
  projectName: string;
  prompt: string;
  aspectRatio: string;
  templateId?: string;
};

type CreateNewWorkbenchProps = {
  onStart: (preset: StudioStartPreset) => void;
};

const heroScenarios = [
  IMAGE2_SCENARIOS.find((scenario) => scenario.id === 'product-premium-hero')!,
  IMAGE2_SCENARIOS.find((scenario) => scenario.id === 'cleanup-object')!,
  IMAGE2_SCENARIOS.find((scenario) => scenario.id === 'variation-style')!,
  IMAGE2_SCENARIOS.find((scenario) => scenario.id === 'extend-horizontal')!,
  IMAGE2_SCENARIOS.find((scenario) => scenario.id === 'enhance-resolution')!,
  IMAGE2_SCENARIOS.find((scenario) => scenario.id === 'replace-background')!,
];

const groupIcons: Record<string, typeof Sparkles> = {
  商品生成: PackagePlus,
  图像清理: Brush,
  局部替换: WandSparkles,
  变体生成: RotateCw,
  画幅扩展: Expand,
  质量增强: Zap,
};

function presetFromScenario(scenario: Image2Scenario): StudioStartPreset {
  return {
    projectName: scenario.title,
    prompt: '',
    aspectRatio: scenario.defaultAspectRatio,
    templateId: scenario.id,
  };
}

export function CreateNewWorkbench({ onStart }: CreateNewWorkbenchProps) {
  const scenarioGroups = groupedScenarios();

  return (
    <div className="h-screen overflow-hidden bg-[#0d0d0b] text-on-surface">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)] max-lg:grid-cols-1">
        <aside className="border-r border-white/[0.08] bg-[#111110] p-3 max-lg:hidden">
          <div className="px-2 pb-4">
            <div className="text-sm font-bold text-lime">AetherGenix</div>
            <div className="mt-1 text-xs text-on-surface-variant">Image-2 Atlas</div>
          </div>
          <nav className="space-y-1 text-sm">
            {[
              ['场景图册', Sparkles],
              ['商品生成', PackagePlus],
              ['图像清理', Brush],
              ['局部替换', WandSparkles],
              ['变体生成', RotateCw],
              ['画幅扩展', Expand],
              ['质量增强', Zap],
              ['历史图册', Images],
            ].map(([label, Icon], index) => {
              const NavIcon = Icon as typeof Sparkles;
              return (
                <button
                  key={label as string}
                  type="button"
                  className={`flex h-10 w-full items-center gap-2 rounded-md px-3 text-left ${
                    index === 0
                      ? 'bg-lime text-on-lime'
                      : 'text-on-surface-variant hover:bg-white/[0.06] hover:text-on-surface'
                  }`}
                >
                  <NavIcon size={16} aria-hidden="true" />
                  <span className="truncate">{label as string}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-0 overflow-y-auto bg-[#0d0d0b]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Image-2 Scenario Atlas</div>
                <h1 className="mt-2 font-display text-3xl font-bold text-on-surface sm:text-4xl">
                  用场景语言重绘图片。
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  选择一个编辑场景，系统会把它翻译成稳定的 image-2 提示词，并沉淀成可复用图册。
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost rounded-md"
                onClick={() => onStart(presetFromScenario(IMAGE2_SCENARIOS[0]))}
              >
                Start with image
              </button>
            </header>

            <section>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {heroScenarios.map((scenario) => {
                  const Icon = groupIcons[scenario.group] ?? Sparkles;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      className="group grid min-h-44 grid-cols-[1fr_136px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#181715] text-left transition hover:border-lime/70 hover:bg-[#1d1c19] max-sm:grid-cols-1"
                      onClick={() => onStart(presetFromScenario(scenario))}
                    >
                      <span className="flex min-w-0 flex-col justify-between p-4">
                        <span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-lime">
                            <Icon size={17} aria-hidden="true" />
                          </span>
                          <span className="mt-5 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                            {scenario.group}
                          </span>
                          <span className="mt-1 block font-display text-xl font-bold text-on-surface">{scenario.title}</span>
                          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-on-surface-variant">
                            {scenario.description}
                          </span>
                        </span>
                        <span className="mt-4 inline-flex text-xs font-semibold text-lime">Open editor</span>
                      </span>
                      <span className="relative min-h-40 overflow-hidden bg-white/[0.03] max-sm:min-h-44">
                        <img
                          src={scenario.afterImage}
                          alt=""
                          className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-100"
                        />
                        <span className="absolute inset-0 bg-gradient-to-l from-transparent to-black/25" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-on-surface">All Image-2 Scenarios</h2>
                  <span className="text-xs text-on-surface-variant">{IMAGE2_SCENARIOS.length} prompts</span>
                </div>
                <div className="grid gap-4">
                  {Object.entries(scenarioGroups).map(([group, scenarios]) => {
                    const Icon = groupIcons[group] ?? Sparkles;
                    return (
                      <section key={group} className="rounded-lg border border-white/[0.08] bg-[#141412] p-3">
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                          <Icon size={16} className="text-lime" aria-hidden="true" />
                          {group}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {scenarios.map((scenario) => (
                            <button
                              key={scenario.id}
                              type="button"
                              className="group overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] text-left transition hover:border-lime/70"
                              onClick={() => onStart(presetFromScenario(scenario))}
                            >
                              <span className="relative block aspect-[1.45] overflow-hidden bg-white/[0.03]">
                                <img
                                  src={scenario.afterImage}
                                  alt=""
                                  className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-100"
                                />
                                <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                              </span>
                              <span className="block p-3">
                                <span className="block truncate text-sm font-bold text-on-surface">{scenario.shortTitle}</span>
                                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-on-surface-variant">
                                  {scenario.description}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-white/[0.08] bg-[#181715] p-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-lime text-on-lime">
                    <Image size={18} aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold text-on-surface">统一 Image-2 Runner</h2>
                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                    左侧场景不是一堆孤立功能，而是一套 prompt 模板。上传图片后，系统统一拼接场景提示词并调用 image-2。
                  </p>
                </section>

                <section className="rounded-lg border border-lime/25 bg-lime/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Atlas Loop</div>
                  <div className="mt-3 space-y-2 text-xs leading-5 text-on-surface-variant">
                    <p>1. 选择场景</p>
                    <p>2. 上传输入图</p>
                    <p>3. 补充自然语言需求</p>
                    <p>4. 生成并沉淀到图册</p>
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
