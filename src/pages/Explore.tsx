import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon, PenLine } from 'lucide-react';
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

export default function Explore() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { t } = useSite();
  const reusePromptLabel = `${t('home_clone_prompt')} ${t('side_create')}`;
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
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

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await getInspirations({ limit: PAGE_SIZE, offset });
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        return [...prev, ...res.items.filter((i) => !existingIds.has(i.id))];
      });
      setOffset((o) => o + res.items.length);
      setHasMore(res.items.length === PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset]);

  useEffect(() => {
    loadMore();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
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

      <div ref={sentinelRef} className="h-4" />
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
