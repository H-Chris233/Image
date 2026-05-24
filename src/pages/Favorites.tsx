import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, ArrowDown, HeartOff, ImageOff, Loader2, LogIn, Maximize2, PenLine, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getFavoriteInspirations, InspirationItem, unfavoriteInspiration } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { copyTextToClipboard } from '../clipboard';
import ImagePreviewModal from '../components/ImagePreviewModal';
import MasonryGrid from '../components/MasonryGrid';
import RetryImage from '../components/RetryImage';
import { Button, IconButton, TextInputControl } from '../components/design-system';
import { useNotifier } from '../notifications';
import { useSite } from '../site';

const FAVORITE_PAGE_SIZE = 24;
const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const FAVORITE_CARD_ESTIMATED_HEIGHT = 430;

function WorkSurfaceState({
  accent = 'primary',
  action,
  description,
  icon,
  secondaryAction,
  title,
}: {
  accent?: 'primary' | 'secondary' | 'error';
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
}) {
  const accentClasses = {
    primary: 'border-primary/25 bg-primary/10 text-primary shadow-primary/10',
    secondary: 'border-secondary/25 bg-secondary/10 text-secondary shadow-secondary/10',
    error: 'border-error/25 bg-error/10 text-error shadow-error/10',
  }[accent];

  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-outline-variant/70 bg-surface/70 px-6 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${accentClasses}`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-on-surface">{title}</h2>
        <p className="mt-2 max-h-32 overflow-y-auto break-words text-sm leading-6 text-on-surface-variant [overflow-wrap:anywhere]">{description}</p>
        {(action || secondaryAction) ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FavoritesHeader({
  disabled,
  loading,
  onClearSearch,
  onSearch,
  query,
  setQuery,
}: {
  disabled?: boolean;
  loading?: boolean;
  onClearSearch?: () => void;
  onSearch?: () => void;
  query?: string;
  setQuery?: (query: string) => void;
}) {
  const { t } = useSite();

  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-6 border-b border-white/10 pb-6 md:flex-row md:items-end">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
          <span className="h-[1px] w-4 bg-secondary" /> {t('favorites_tag')}
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface md:text-5xl">{t('favorites_title')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">{t('favorites_subtitle')}</p>
      </div>

      {!disabled ? (
        <div className="flex w-full min-w-0 md:w-auto">
          <label className="relative flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low py-0 pl-3 pr-12 text-on-surface transition-colors focus-within:border-secondary md:w-72">
            <Search className="shrink-0 text-primary/50" size={16} />
            <TextInputControl
              aria-label={t('favorites_search')}
              value={query}
              onChange={(event) => setQuery?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSearch?.();
                }
              }}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
              placeholder={t('favorites_search')}
              type="text"
            />
            {query?.trim() ? (
              <IconButton
                label={t('history_clear_search')}
                icon={<X size={14} />}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
                onClick={onClearSearch}
                type="button"
              />
            ) : loading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-secondary" size={14} />
            ) : null}
          </label>
        </div>
      ) : null}
    </div>
  );
}

function FavoriteCard({
  item,
  onPreview,
  onReusePrompt,
  onUnfavorite,
  removing,
}: {
  item: InspirationItem;
  onPreview: (item: InspirationItem) => void;
  onReusePrompt: (item: InspirationItem) => void;
  onUnfavorite: (item: InspirationItem) => void;
  removing: boolean;
}) {
  const { t } = useSite();
  const hasImage = Boolean(item.image_url);
  const title = item.title || item.section || t('favorites_title');
  const meta = item.favorite_created_at ? formatDate(item.favorite_created_at) : item.section;

  return (
    <article
      className={`group overflow-hidden rounded-2xl border border-white/10 bg-[#14120f] shadow-[inset_0_0_0_1px_rgba(240,237,232,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-secondary/45 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)] ${removing ? 'opacity-70' : ''}`}
      aria-busy={removing}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#111110] sm:aspect-[4/3]">
        {hasImage ? (
          <RetryImage
            alt={title}
            className="h-full w-full"
            loading="lazy"
            src={item.image_url}
            variant="gallery"
          />
        ) : (
          <div className="flex h-full min-h-44 flex-col items-center justify-center gap-3 border-b border-white/10 bg-[linear-gradient(135deg,rgba(227,255,116,0.08),rgba(254,110,0,0.08),rgba(20,18,15,1))] p-5 text-center text-on-surface-variant">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/25 text-secondary">
              <ImageOff size={18} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{t('image_load_failed')}</div>
          </div>
        )}

        <IconButton
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/80 backdrop-blur transition-colors hover:border-primary hover:bg-black/75 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => onPreview(item)}
          disabled={!hasImage}
          label={`${t('history_preview')} ${title}`}
          icon={<Maximize2 size={15} />}
        />
      </div>

      <div className="space-y-4 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-on-surface [overflow-wrap:anywhere]">{title}</h2>
            <div className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-secondary/80">{item.section || t('favorites_tag')}</div>
          </div>
          {meta ? <div className="shrink-0 whitespace-nowrap text-[10px] text-white/35">{meta}</div> : null}
        </div>

        <p className="min-h-[4.5rem] break-words text-sm leading-6 text-white/75 line-clamp-3 [overflow-wrap:anywhere]">
          {item.prompt}
        </p>

        <div className="grid grid-cols-[1fr_44px] gap-2">
          <Button
            variant="primary"
            iconStart={<PenLine size={14} className="shrink-0" />}
            className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[#f0ede8] px-4 text-xs font-semibold text-[#1a1917] transition-all hover:bg-white disabled:pointer-events-none disabled:opacity-40"
            type="button"
            onClick={() => onReusePrompt(item)}
            disabled={removing || !item.prompt}
            aria-label={`${t('home_clone_prompt')} ${title}`}
          >
            <span className="truncate">{t('home_clone_prompt')}</span>
          </Button>
          <IconButton
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/65 transition-colors hover:border-secondary hover:bg-secondary/10 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
            disabled={removing}
            onClick={() => onUnfavorite(item)}
            label={`${t('home_unfavorite_case')} ${title}`}
            icon={removing ? <Loader2 className="animate-spin" size={15} /> : <HeartOff size={15} />}
          />
        </div>
      </div>
    </article>
  );
}

export default function Favorites() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const { notifyError, notifySuccess } = useNotifier();
  const navigate = useNavigate();
  const loadRequestRef = useRef(0);
  const searchDebounceRef = useRef<number | null>(null);
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<InspirationItem | null>(null);

  async function load(nextOffset = 0, append = false, searchQuery = submittedQuery) {
    const requestId = ++loadRequestRef.current;
    if (!viewer?.authenticated) {
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getFavoriteInspirations({
        limit: FAVORITE_PAGE_SIZE,
        offset: nextOffset,
        q: searchQuery.trim() || undefined,
      });
      if (requestId !== loadRequestRef.current) {
        return;
      }
      setItems((current) => (append ? [...current, ...data.items] : data.items));
      setOffset(nextOffset + data.items.length);
      setTotal(Number(data.total ?? data.items.length));
    } catch (err) {
      if (requestId !== loadRequestRef.current) {
        return;
      }
      setLoadError(true);
      notifyError(err);
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    if (!viewer?.authenticated) {
      loadRequestRef.current += 1;
      setQuery('');
      setSubmittedQuery('');
      setItems([]);
      setOffset(0);
      setTotal(0);
      setLoadError(false);
      setLoading(false);
      setRemovingIds([]);
      setPreviewItem(null);
      return undefined;
    }

    const nextQuery = query.trim();
    searchDebounceRef.current = window.setTimeout(() => {
      setSubmittedQuery(nextQuery);
      load(0, false, nextQuery).catch(() => undefined);
    }, 350);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [query, viewer?.authenticated, viewer?.owner_id]);

  async function handleUnfavorite(item: InspirationItem) {
    if (!viewer?.authenticated) {
      notifyError(t('favorites_login_required'));
      openAuthModal('login', '/favorites', 'favorites');
      return;
    }
    setRemovingIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
    try {
      await unfavoriteInspiration(item.id);
      setItems((current) => current.filter((favorite) => favorite.id !== item.id));
      setTotal((current) => Math.max(0, current - 1));
      notifySuccess(t('home_favorite_removed'));
    } catch (err) {
      notifyError(err);
    } finally {
      setRemovingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  async function handleClonePrompt(item: InspirationItem) {
    if (!item.prompt) {
      notifyError(t('toast_error'));
      return;
    }
    if (!viewer?.authenticated) {
      window.sessionStorage.setItem(PROMPT_TRANSFER_KEY, item.prompt);
      notifyError(t('home_generation_login_required'));
      openAuthModal('login', '/create', 'reuse-prompt');
      return;
    }
    window.sessionStorage.setItem(PROMPT_TRANSFER_KEY, item.prompt);
    const copied = await copyTextToClipboard(item.prompt);
    if (copied) {
      notifySuccess(t('home_prompt_copied'));
    } else {
      notifyError(t('toast_error'));
    }
    navigate('/create');
  }

  function handleClearSearch() {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setQuery('');
    setSubmittedQuery('');
    load(0, false, '').catch(() => undefined);
  }

  function handleApplySearch() {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    load(0, false, nextQuery).catch(() => undefined);
  }

  if (!viewer?.authenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-6">
        <FavoritesHeader disabled />
        <WorkSurfaceState
          accent="secondary"
          description={t('favorites_login_desc')}
          icon={<LogIn size={24} />}
          title={t('favorites_login_title')}
          action={(
            <Button
              variant="primary"
              iconStart={<LogIn size={16} />}
              className="min-h-11"
              type="button"
              onClick={() => openAuthModal('login', '/favorites', 'favorites')}
            >
              {t('top_login')}
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-6">
      <FavoritesHeader
        loading={loading}
        onClearSearch={handleClearSearch}
        onSearch={handleApplySearch}
        query={query}
        setQuery={setQuery}
      />

      {loading && items.length === 0 ? (
        <WorkSurfaceState
          accent="secondary"
          description={t('favorites_subtitle')}
          icon={<Loader2 className="animate-spin" size={24} />}
          title={t('favorites_loading')}
        />
      ) : loadError && items.length === 0 ? (
        <WorkSurfaceState
          accent="error"
          description={t('favorites_error_desc')}
          icon={<AlertCircle size={24} />}
          title={t('favorites_error_title')}
          action={(
            <Button variant="primary" className="min-h-11" type="button" onClick={() => load(0, false).catch(() => undefined)} iconStart={<RefreshCw size={16} />}>
              {t('history_retry')}
            </Button>
          )}
        />
      ) : items.length > 0 ? (
        <>
          <MasonryGrid
            items={items}
            getKey={(item: InspirationItem) => item.id}
            getEstimatedHeight={() => FAVORITE_CARD_ESTIMATED_HEIGHT}
            renderItem={(item: InspirationItem) => {
              const removing = removingIds.includes(item.id);
              return (
                <FavoriteCard
                  item={item}
                  onPreview={setPreviewItem}
                  onReusePrompt={(favorite) => handleClonePrompt(favorite).catch(() => undefined)}
                  onUnfavorite={(favorite) => handleUnfavorite(favorite).catch(() => undefined)}
                  removing={removing}
                />
              );
            }}
          />

          {loadError ? (
            <div className="mt-8 flex justify-center">
              <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-error/25 bg-error/10 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-error">{t('favorites_error_title')}</div>
                  <div className="mt-1 break-words text-xs leading-5 text-on-surface-variant [overflow-wrap:anywhere]">{t('favorites_error_desc')}</div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  iconStart={<RefreshCw size={14} />}
                  type="button"
                  onClick={() => load(0, false).catch(() => undefined)}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-error/30 px-3 text-xs font-semibold text-error transition-colors hover:bg-error/15"
                >
                  {t('history_retry')}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-12 flex justify-center">
            {offset < total ? (
              <Button
                variant="ghost"
                iconStart={loading ? <Loader2 className="animate-spin" size={14} /> : <ArrowDown size={14} />}
                onClick={() => load(offset, true)}
                disabled={loading}
                className="flex min-h-11 items-center gap-2 border border-primary/30 bg-primary/5 px-8 py-3 text-xs uppercase tracking-widest text-primary transition-colors hover:border-primary disabled:opacity-50"
                type="button"
              >
                {t('history_load_more')}
              </Button>
            ) : (
              <div className="text-xs uppercase tracking-[0.3em] text-white/35">{t('favorites_all_loaded')}</div>
            )}
          </div>
        </>
      ) : (
        <WorkSurfaceState
          accent={submittedQuery.trim() ? 'secondary' : 'primary'}
          description={submittedQuery.trim() ? t('favorites_search_empty_desc') : t('favorites_empty_desc')}
          icon={submittedQuery.trim() ? <Search size={24} /> : <Sparkles size={24} />}
          title={submittedQuery.trim() ? t('favorites_search_empty_title') : t('favorites_empty_title')}
          action={submittedQuery.trim() ? (
            <Button
              variant="ghost"
              iconStart={<X size={16} />}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
              type="button"
              onClick={handleClearSearch}
            >
              {t('history_clear_search')}
            </Button>
          ) : (
            <Button variant="primary" className="min-h-11" type="button" onClick={() => navigate('/explore')} iconStart={<Sparkles size={16} />}>
              {t('favorites_explore_action')}
            </Button>
          )}
        />
      )}

      <ImagePreviewModal
        imageUrl={previewItem?.image_url || null}
        alt={previewItem?.title || 'preview'}
        subtitle={previewItem?.prompt}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}
