import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ImageIcon, PenLine, RefreshCw } from 'lucide-react';
import { getInspirations, InspirationItem } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import MasonryGrid from '../components/MasonryGrid';
import RetryImage from '../components/RetryImage';
import { useSite } from '../site';

const PAGE_SIZE = 48;
const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const SKELETON_COUNT = 16;
const LOAD_MORE_SKELETON_COUNT = 8;
const EXPLORE_CARD_RATIOS = [0.72, 0.78, 0.86, 0.94, 1.05, 1.18, 1.32];

type SkeletonItem = {
  id: string;
  ratio: number;
};

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getExploreCardRatio(seed: string) {
  return EXPLORE_CARD_RATIOS[stableHash(seed) % EXPLORE_CARD_RATIOS.length];
}

function getExploreEstimatedHeight(item: InspirationItem, index: number) {
  const ratio = getExploreCardRatio(item.id || item.image_url || String(index));
  return 320 / ratio;
}

function getExploreErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return null;
}

export default function Explore() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { t } = useSite();
  const reusePromptLabel = `${t('home_clone_prompt')} ${t('side_create')}`;
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nextOffsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadErrorRef = useRef(false);
  const inFlightOffsetRef = useRef<number | null>(null);
  const skeletonItems = useMemo<SkeletonItem[]>(
    () => Array.from({ length: SKELETON_COUNT }, (_, index) => ({
      id: `initial-${index}`,
      ratio: EXPLORE_CARD_RATIOS[index % EXPLORE_CARD_RATIOS.length],
    })),
    [],
  );
  const loadMoreSkeletonItems = useMemo<SkeletonItem[]>(
    () => Array.from({ length: LOAD_MORE_SKELETON_COUNT }, (_, index) => ({
      id: `more-${index}`,
      ratio: EXPLORE_CARD_RATIOS[(index + 2) % EXPLORE_CARD_RATIOS.length],
    })),
    [],
  );

  const loadMore = useCallback(async (options: { force?: boolean } = {}) => {
    if (inFlightOffsetRef.current !== null) return;
    if (!hasMoreRef.current && !options.force) return;
    if (loadErrorRef.current && !options.force) return;

    const requestedOffset = nextOffsetRef.current;
    inFlightOffsetRef.current = requestedOffset;
    setLoading(true);
    setLoadError(false);
    setLoadErrorMessage(null);
    loadErrorRef.current = false;

    try {
      const res = await getInspirations({ limit: PAGE_SIZE, offset: requestedOffset });
      const responseItems = res.items || [];

      if (nextOffsetRef.current !== requestedOffset) return;

      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const nextItems = requestedOffset === 0 ? [] : [...prev];

        responseItems.forEach((item) => {
          if (!existingIds.has(item.id)) {
            existingIds.add(item.id);
            nextItems.push(item);
          }
        });

        return nextItems;
      });

      const nextOffset = requestedOffset + responseItems.length;
      const total = Number.isFinite(res.total) ? res.total : null;
      const nextHasMore = responseItems.length === PAGE_SIZE && (total === null || nextOffset < total);
      nextOffsetRef.current = nextOffset;
      hasMoreRef.current = nextHasMore;
    } catch (error) {
      loadErrorRef.current = true;
      setLoadError(true);
      setLoadErrorMessage(getExploreErrorMessage(error));
    } finally {
      if (inFlightOffsetRef.current === requestedOffset) {
        inFlightOffsetRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadMore().catch(() => undefined);
  }, [loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore().catch(() => undefined); },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleReusePrompt(item: InspirationItem) {
    if (!item.prompt) return;
    window.sessionStorage.setItem(PROMPT_TRANSFER_KEY, item.prompt);
    if (viewer?.authenticated) {
      navigate('/create');
    } else {
      openAuthModal('login', '/create');
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-screen-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-[#f0ede8] tracking-tight">{t('home_title')}</h1>
        <p className="text-sm text-on-surface-variant mt-2">{t('explore_desc')}</p>
      </div>

      {items.length === 0 && loading ? (
        <MasonryGrid<SkeletonItem>
          items={skeletonItems}
          getKey={(item) => item.id}
          getEstimatedHeight={(item) => 320 / item.ratio}
          renderItem={(item, index) => <ExploreSkeletonCard ratio={item.ratio} loadingLabel={index === 0 ? t('home_loading_feed') : undefined} />}
        />
      ) : items.length === 0 && loadError ? (
        <ExploreStatePanel
          accent="error"
          action={(
            <button
              type="button"
              onClick={() => loadMore({ force: true }).catch(() => undefined)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E3FF74]/30 bg-[#E3FF74] px-4 text-sm font-semibold text-[#1a1917] transition-colors hover:bg-white"
            >
              <RefreshCw size={16} />
              {t('history_retry')}
            </button>
          )}
          description={loadErrorMessage || t('toast_error')}
          icon={<AlertCircle size={24} />}
          title={t('toast_error')}
        />
      ) : items.length === 0 ? (
        <ExploreStatePanel
          description={t('explore_desc')}
          icon={<ImageIcon size={24} />}
          title={t('home_empty_feed')}
        />
      ) : (
        <MasonryGrid<InspirationItem>
          items={items}
          getKey={(item) => item.id}
          getEstimatedHeight={getExploreEstimatedHeight}
          renderItem={(item, index) => (
            <ExploreCard item={item} index={index} reusePromptLabel={reusePromptLabel} onReusePrompt={handleReusePrompt} />
          )}
        />
      )}

      {loading && items.length > 0 && (
        <div className="pt-6">
          <MasonryGrid<SkeletonItem>
            items={loadMoreSkeletonItems}
            getKey={(item) => item.id}
            getEstimatedHeight={(item) => 320 / item.ratio}
            renderItem={(item, index) => <ExploreSkeletonCard ratio={item.ratio} compact loadingLabel={index === 0 ? t('home_loading_more') : undefined} />}
          />
        </div>
      )}

      {items.length > 0 && loadError && (
        <div className="mt-8 flex justify-center">
          <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-error/25 bg-error/10 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-error">{t('toast_error')}</div>
              <div className="mt-1 break-words text-xs leading-5 text-on-surface-variant">{loadErrorMessage || t('toast_error')}</div>
            </div>
            <button
              type="button"
              onClick={() => loadMore({ force: true }).catch(() => undefined)}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-error/30 px-3 text-xs font-semibold text-error transition-colors hover:bg-error/15"
            >
              <RefreshCw size={14} />
              {t('history_retry')}
            </button>
          </div>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}

function ExploreStatePanel({
  accent = 'primary',
  action,
  description,
  icon,
  title,
}: {
  accent?: 'primary' | 'error';
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  const accentClasses = {
    primary: 'border-[#E3FF74]/25 bg-[#E3FF74]/10 text-[#E3FF74] shadow-[#E3FF74]/10',
    error: 'border-error/25 bg-error/10 text-error shadow-error/10',
  }[accent];

  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-[#f0ede8]/10 bg-[#14120f]/80 px-6 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${accentClasses}`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#f0ede8]">{title}</h2>
        <p className="mt-2 break-words text-sm leading-6 text-on-surface-variant">{description}</p>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

function ExploreCard({
  item,
  index,
  reusePromptLabel,
  onReusePrompt,
}: {
  item: InspirationItem;
  index: number;
  reusePromptLabel: string;
  onReusePrompt: (item: InspirationItem) => void;
}) {
  const canReuse = Boolean(item.prompt);
  const ratio = getExploreCardRatio(item.id || item.image_url || String(index));
  const cardStyle: CSSProperties = { aspectRatio: String(ratio) };

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group bg-[#14120f] shadow-[inset_0_0_0_1px_rgba(240,237,232,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(227,255,116,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/60"
      style={cardStyle}
      role={canReuse ? 'button' : undefined}
      tabIndex={canReuse ? 0 : undefined}
      aria-label={canReuse ? reusePromptLabel : undefined}
      onClick={() => { if (canReuse) onReusePrompt(item); }}
      onKeyDown={(event) => {
        if (!canReuse) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onReusePrompt(item);
        }
      }}
    >
      <RetryImage
        src={item.image_url ?? ''}
        alt={item.title || item.prompt}
        className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        variant="gallery"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[#E3FF74] opacity-0 transition-opacity duration-200 group-hover:opacity-80 group-focus-visible:opacity-80" />

      {item.prompt && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <div className="p-3 sm:p-4">
            <p className="mb-3 hidden text-xs leading-relaxed text-white/90 line-clamp-2 sm:block">
              {item.prompt}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onReusePrompt(item);
              }}
              className="flex items-center gap-1.5 rounded-full bg-[#f0ede8] text-[#1a1917] px-3 py-1.5 text-xs font-semibold transition-all hover:bg-white"
            >
              <PenLine size={12} />
              {reusePromptLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExploreSkeletonCard({ ratio, compact = false, loadingLabel }: { ratio: number; compact?: boolean; loadingLabel?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#f0ede8]/10 bg-[#14120f] shadow-[inset_0_0_0_1px_rgba(227,255,116,0.04)] ${compact ? 'opacity-75' : ''}`}
      style={{ aspectRatio: String(ratio) }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(227,255,116,0.14),transparent_34%),linear-gradient(110deg,rgba(240,237,232,0.04),rgba(240,237,232,0.09),rgba(227,255,116,0.1),rgba(240,237,232,0.04))] bg-[length:100%_100%,220%_100%] animate-skeleton" />
      <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#f0ede8]/10 bg-black/20 text-[#E3FF74]/70">
        <ImageIcon size={16} />
      </div>
      {loadingLabel ? (
        <div className="absolute left-4 right-4 top-16 rounded-full border border-[#f0ede8]/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-[#d8d3cc]/80">
          {loadingLabel}
        </div>
      ) : null}
      <div className="absolute inset-x-3 bottom-3 space-y-2">
        <div className="h-2.5 w-4/5 rounded-full bg-[#f0ede8]/16" />
        <div className="h-2.5 w-2/5 rounded-full bg-[#E3FF74]/20" />
        <div className="h-8 w-28 rounded-full bg-[#f0ede8]/12" />
      </div>
    </div>
  );
}
