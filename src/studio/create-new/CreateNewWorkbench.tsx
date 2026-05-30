import {
  Image,
  Images,
  PackagePlus,
  PenLine,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { CUSTOMERS, scenesOf } from '../../components/ecommerce/sceneCatalog';
import { templateCatalog } from '../templates/templateCatalog';

export type StudioStartPreset = {
  projectName: string;
  prompt: string;
  aspectRatio: string;
  templateId?: string;
};

type CreateNewWorkbenchProps = {
  onStart: (preset: StudioStartPreset) => void;
};

const creationTypes = [
  {
    id: 'image2-product',
    title: 'Image-2 Product Shot',
    kicker: '商品图生成',
    prompt: templateCatalog[0]?.prompt ?? '',
    image: templateCatalog[1]?.sampleImage,
    Icon: PackagePlus,
  },
  {
    id: 'image2-retouch',
    title: 'Image-2 Retouch',
    kicker: '精修增强',
    prompt:
      'Enhance the uploaded product into a premium ecommerce product image with cleaner lighting, sharper material detail, realistic color, and a polished commercial finish.',
    image: '/scene-samples/cross_border_ecommerce_premium_hero.jpg',
    Icon: Sparkles,
  },
  {
    id: 'image2-poster',
    title: 'Image-2 Poster',
    kicker: '营销海报',
    prompt: 'Create a polished ecommerce advertising image with the product as hero, bold composition, headline space, and premium campaign lighting.',
    image: '/scene-samples/cross_border_ecommerce_poster.jpg',
    Icon: PenLine,
  },
];

const productCategories = CUSTOMERS.flatMap((customer) =>
  scenesOf(customer.key)
    .slice(0, customer.key.includes('ecommerce') ? 6 : 2)
    .map((scene) => ({
      id: `${scene.customerKey}-${scene.sceneKey}`,
      title: scene.label,
      group: customer.label,
      prompt: scene.prompt,
      image: scene.sampleImage,
    })),
).slice(0, 18);

const recentProjects = [
  { name: 'Untitled Project', meta: '1024 x 1024', image: '/scene-samples/cross_border_ecommerce_premium_hero.jpg' },
  { name: 'Beauty PDP Hero', meta: '1 generated board', image: '/scene-samples/domestic_ecommerce_premium_hero.jpg' },
  { name: 'Poster Variants', meta: '4 artboards', image: '/scene-samples/cross_border_ecommerce_poster.jpg' },
];

export function CreateNewWorkbench({ onStart }: CreateNewWorkbenchProps) {
  function startFromPreset(preset: StudioStartPreset) {
    onStart(preset);
  }

  return (
    <div className="h-screen overflow-hidden bg-[#0d0d0b] text-on-surface">
      <div className="grid h-full grid-cols-[220px_minmax(0,1fr)] max-lg:grid-cols-1">
        <aside className="border-r border-white/[0.08] bg-[#111110] p-3 max-lg:hidden">
          <div className="px-2 pb-4">
            <div className="text-sm font-bold text-lime">AetherGenix</div>
            <div className="mt-1 text-xs text-on-surface-variant">Image-2 Studio</div>
          </div>
          <nav className="space-y-1 text-sm">
            {[
              ['Image-2 Create', Sparkles],
              ['Product Images', Images],
              ['Retouch', WandSparkles],
              ['Reference Assets', Image],
              ['All Assets', Images],
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
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Image-2 Create</div>
                <h1 className="mt-2 font-display text-3xl font-bold text-on-surface sm:text-4xl">
                  Choose an image workflow.
                </h1>
              </div>
              <button
                type="button"
                className="btn-ghost rounded-md"
                onClick={() =>
                  startFromPreset({
                    projectName: 'Image-2 Draft',
                    prompt: '',
                    aspectRatio: '1:1',
                  })
                }
              >
                Start with upload
              </button>
            </header>

            <section>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {creationTypes.map(({ id, title, kicker, prompt, image, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className="group grid min-h-44 grid-cols-[1fr_136px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#181715] text-left transition hover:border-lime/70 hover:bg-[#1d1c19] max-sm:grid-cols-1"
                    onClick={() =>
                      startFromPreset({
                        projectName: title,
                        prompt,
                        aspectRatio: '1:1',
                        templateId: id,
                      })
                    }
                  >
                    <span className="flex min-w-0 flex-col justify-between p-4">
                      <span>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-lime">
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="mt-5 block text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                          {kicker}
                        </span>
                        <span className="mt-1 block font-display text-xl font-bold text-on-surface">{title}</span>
                      </span>
                      <span className="mt-4 inline-flex text-xs font-semibold text-lime">Create</span>
                    </span>
                    <span className="relative min-h-40 overflow-hidden bg-white/[0.03] max-sm:min-h-44">
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-100"
                        />
                      ) : null}
                      <span className="absolute inset-0 bg-gradient-to-l from-transparent to-black/25" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-on-surface">Image-2 Product Presets</h2>
                  <span className="text-xs text-on-surface-variant">{productCategories.length} presets</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {productCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="group overflow-hidden rounded-lg border border-white/[0.08] bg-[#181715] text-left transition hover:border-lime/70"
                      onClick={() =>
                        startFromPreset({
                          projectName: category.title,
                          prompt: category.prompt,
                          aspectRatio: '1:1',
                          templateId: category.id,
                        })
                      }
                    >
                      <span className="relative block aspect-[1.35] overflow-hidden bg-white/[0.03]">
                        <img
                          src={category.image}
                          alt=""
                          className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-100"
                        />
                        <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                      </span>
                      <span className="block p-3">
                        <span className="block truncate text-sm font-bold text-on-surface">{category.title}</span>
                        <span className="mt-1 block truncate text-xs text-on-surface-variant">{category.group}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="space-y-4">
                <section className="rounded-lg border border-white/[0.08] bg-[#181715] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-on-surface">Recent Projects</h2>
                    <span className="text-xs text-on-surface-variant">Local</span>
                  </div>
                  <div className="space-y-2">
                    {recentProjects.map((project) => (
                      <button
                        key={project.name}
                        type="button"
                        className="grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-md p-2 text-left hover:bg-white/[0.05]"
                        onClick={() =>
                          startFromPreset({
                            projectName: project.name,
                            prompt: templateCatalog[0]?.prompt ?? '',
                            aspectRatio: '1:1',
                          })
                        }
                      >
                        <img src={project.image} alt="" className="h-16 w-16 rounded-md object-cover" />
                        <span className="min-w-0 self-center">
                          <span className="block truncate text-sm font-semibold text-on-surface">{project.name}</span>
                          <span className="mt-1 block truncate text-xs text-on-surface-variant">{project.meta}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-lime/25 bg-lime/10 p-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-lime text-on-lime">
                    <WandSparkles size={18} aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold text-on-surface">Image-2 Only</h2>
                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                    当前版本只开放上传参考图后的图片生成、精修和营销图扩展。
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      className="h-10 rounded-md bg-lime text-sm font-bold text-on-lime hover:bg-[#f0ff9c]"
                      onClick={() =>
                        startFromPreset({
                          projectName: 'Image-2 Product Shot',
                          prompt: templateCatalog[0]?.prompt ?? '',
                          aspectRatio: '1:1',
                        })
                      }
                    >
                      Start Image-2
                    </button>
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
