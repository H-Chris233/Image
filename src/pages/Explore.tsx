import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import { getInspirations, InspirationItem } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import MasonryGrid from '../components/MasonryGrid';
import RetryImage from '../components/RetryImage';
import { useSite } from '../site';

const PAGE_SIZE = 48;
const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';

export default function Explore() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { t } = useSite();
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
        <h1 className="text-3xl font-bold font-display text-gradient-genesis tracking-tight">{t('home_title')}</h1>
        <p className="text-sm text-on-surface-variant mt-2">{t('explore_desc')}</p>
      </div>

      <MasonryGrid<InspirationItem>
        items={items}
        getKey={(item) => item.id}
        renderItem={(item) => (
          <ExploreCard item={item} onReusePrompt={handleReusePrompt} />
        )}
      />

      {loading && (
        <div className="flex justify-center py-12">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}

function ExploreCard({
  item,
  onReusePrompt,
}: {
  item: InspirationItem;
  onReusePrompt: (item: InspirationItem) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
      style={{ boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.06)' : 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <RetryImage
        src={item.image_url ?? ''}
        alt={item.title || item.prompt}
        className="w-full block object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />

      {/* 顶部渐变光带（悬停时出现） */}
      {hovered && (
        <div className="absolute inset-x-0 top-0 h-0.5 gradient-genesis animate-fade-in" />
      )}

      {hovered && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent animate-fade-in">
          {item.prompt && (
            <div className="p-4">
              <p className="text-white/90 text-xs leading-relaxed line-clamp-2 mb-3">
                {item.prompt}
              </p>
              <button
                type="button"
                onClick={() => onReusePrompt(item)}
                className="flex items-center gap-1.5 rounded-full gradient-genesis px-3 py-1.5 text-white text-xs font-semibold transition-all hover:brightness-110 shadow-[0_0_12px_rgba(0,212,240,0.3)]"
              >
                <PenLine size={12} />
                复用提示词创作
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
