import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Sparkles } from 'lucide-react';
import { Button } from '../../components/design-system';
import { useAuth } from '../../auth';
import { useAuthModal } from '../../authModal';
import {
  CUSTOMERS,
  SCENE_CATALOG,
  customerLabel,
  type SceneTemplate,
} from '../../components/ecommerce/sceneCatalog';
import { defaultT2 } from '../app/studioNav';
import type { StudioLocation, StudioT1 } from '../app/studioLocation';
import { ASSETS_ROUTE, CREATE_ROUTE, EXPLORE_ROUTE, REDRAW_ROUTE, USER_ROUTE } from '../app/studioRoutes';
import { LeftNav } from '../shell/LeftNav';

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const SCENE_TRANSFER_KEY = 'aethergenix_pending_scene';
const ALL_KEY = 'all';

export function InspirationSurface() {
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const leftNavLocation = useMemo<StudioLocation>(() => ({
    surface: 'inspiration',
    t1: 'inspiration',
    t2: defaultT2('inspiration'),
    t3: null,
    composer: null,
  }), []);

  function handleNavChange(next: StudioLocation) {
    const nextRoute = routeForT1(next.t1);
    if (nextRoute !== EXPLORE_ROUTE && !viewer?.authenticated) {
      openAuthModal('login', nextRoute, next.t1 === 'create' ? 'generate' : null);
      return;
    }
    navigate(nextRoute);
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-background text-on-surface">
      <div className="flex h-full min-h-0">
        <LeftNav location={leftNavLocation} onChange={handleNavChange} />
        <InspirationWorkspace />
      </div>
    </div>
  );
}

export function InspirationWorkspace() {
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [activeCustomer, setActiveCustomer] = useState(ALL_KEY);
  const [copiedKey, setCopiedKey] = useState('');

  const cards = useMemo(
    () => SCENE_CATALOG.filter(
      (scene) => Boolean(scene.sampleImage) && (activeCustomer === ALL_KEY || scene.customerKey === activeCustomer),
    ),
    [activeCustomer],
  );

  function goCreate(path: string) {
    if (!viewer?.authenticated) {
      openAuthModal('login', path, 'generate');
      return;
    }
    navigate(path);
  }

  function handleUseScene(scene: SceneTemplate) {
    window.sessionStorage.setItem(PROMPT_TRANSFER_KEY, scene.prompt);
    window.sessionStorage.setItem(SCENE_TRANSFER_KEY, JSON.stringify({
      customerKey: scene.customerKey,
      sceneKey: scene.sceneKey,
      prompt: scene.prompt,
    }));
    const search = new URLSearchParams({ customer: scene.customerKey, scene: scene.sceneKey });
    goCreate(`${CREATE_ROUTE}/ecommerce?${search.toString()}`);
  }

  function copyPrompt(scene: SceneTemplate) {
    const key = `${scene.customerKey}-${scene.sceneKey}`;
    navigator.clipboard?.writeText(scene.prompt)
      .then(() => {
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey((current) => (current === key ? '' : current)), 1500);
      })
      .catch(() => undefined);
  }

  return (
    <div className="relative z-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
      <main className="mx-auto max-w-[92rem] px-4 pb-24 pt-8 sm:px-8 lg:px-10">
        <section className="ds-stage-enter grid items-end gap-8 border-b border-white/[0.08] pb-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-lime">
              <Sparkles size={14} aria-hidden="true" />
              AetherGenix · 商品图生成
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-on-surface sm:text-5xl">
              上传白底图，
              <br className="hidden sm:block" />
              秒出全平台主图与营销图。
            </h1>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              {SCENE_CATALOG.length} 套专家提示词，覆盖跨境 / 国内电商、餐饮、自媒体与 SaaS。
              点任意一张，带着提示词直接开始生成——不调参、不学习，几秒出图。
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                iconEnd={<ArrowUpRight size={16} aria-hidden="true" />}
                onClick={() => goCreate(`${CREATE_ROUTE}/ecommerce`)}
              >
                开始创作
              </Button>
              <span className="text-sm text-on-surface-variant">
                {SCENE_CATALOG.length} 个场景 · {CUSTOMERS.length} 类商家
              </span>
            </div>
          </div>
        </section>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="场景分类筛选">
          <FilterChip label="全部" active={activeCustomer === ALL_KEY} onClick={() => setActiveCustomer(ALL_KEY)} />
          {CUSTOMERS.map((customer) => (
            <FilterChip
              key={customer.key}
              label={customer.label}
              active={activeCustomer === customer.key}
              onClick={() => setActiveCustomer(customer.key)}
            />
          ))}
        </nav>

        <section className="mt-6 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3 xl:columns-4">
          {cards.map((card, index) => (
            <PromptCard
              key={`${card.customerKey}-${card.sceneKey}`}
              card={card}
              eager={index < 4}
              copied={copiedKey === `${card.customerKey}-${card.sceneKey}`}
              onUse={() => handleUseScene(card)}
              onCopy={() => copyPrompt(card)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`ds-motion-press h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
        active
          ? 'border-lime/45 bg-lime/15 text-lime'
          : 'border-white/[0.08] bg-white/[0.03] text-on-surface-variant hover:border-white/[0.16] hover:text-on-surface'
      }`}
    >
      {label}
    </button>
  );
}

function PromptCard({
  card,
  eager,
  copied,
  onUse,
  onCopy,
}: {
  card: SceneTemplate;
  eager: boolean;
  copied: boolean;
  onUse: () => void;
  onCopy: () => void;
}) {
  return (
    <article className="ds-motion-card group mb-4 break-inside-avoid overflow-hidden rounded-xl border border-white/[0.08] bg-surface">
      <div className="relative overflow-hidden">
        <img
          src={card.sampleImage}
          alt={card.label}
          loading={eager ? 'eager' : 'lazy'}
          className="block w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onCopy}
            aria-label={`复制${card.label}提示词`}
            title={copied ? '已复制' : '复制提示词'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/85 backdrop-blur transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40"
          >
            {copied ? <Check size={15} className="text-lime" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
        </div>
        <div className="absolute inset-x-2 bottom-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <Button
            size="sm"
            variant="primary"
            fullWidth
            iconEnd={<ArrowUpRight size={15} aria-hidden="true" />}
            onClick={onUse}
          >
            套用提示词
          </Button>
        </div>
      </div>
      <div className="p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {customerLabel(card.customerKey)}
        </div>
        <h3 className="mt-1 font-display text-base font-bold text-on-surface">{card.label}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">{card.prompt}</p>
      </div>
    </article>
  );
}

function routeForT1(t1: StudioT1 | null) {
  if (t1 === 'create') return CREATE_ROUTE;
  if (t1 === 'assets') return ASSETS_ROUTE;
  if (t1 === 'redraw') return REDRAW_ROUTE;
  if (t1 === 'user') return USER_ROUTE;
  return EXPLORE_ROUTE;
}
