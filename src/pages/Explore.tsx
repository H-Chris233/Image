import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Copy, ImageIcon, ImageOff, Maximize2, PenLine, RefreshCw, X } from 'lucide-react';
import { getInspirations, InspirationItem } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { copyTextToClipboard } from '../clipboard';
import MasonryGrid from '../components/MasonryGrid';
import RetryImage from '../components/RetryImage';
import { CreateFlowWizard, type WizardResult } from '../components/ecommerce/CreateFlowWizard';
import { useNotifier } from '../notifications';
import { useSite } from '../site';

const PAGE_SIZE = 48;
const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const SKELETON_COUNT = 16;
const LOAD_MORE_SKELETON_COUNT = 8;
const EXPLORE_CARD_RATIOS = [0.94, 1.0, 1.05, 1.12, 1.18];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

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
  const { notifyError, notifySuccess } = useNotifier();
  const reusePromptLabel = t('home_clone_prompt');
  const reusePromptAriaLabel = `${t('home_clone_prompt')} ${t('side_create')}`;
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InspirationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
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
      const imageBackedItems = responseItems.filter((item) => Boolean(item.image_url));

      if (nextOffsetRef.current !== requestedOffset) return;

      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const nextItems = requestedOffset === 0 ? [] : [...prev];

        imageBackedItems.forEach((item) => {
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
      openAuthModal('login', '/create', 'reuse-prompt');
    }
  }

  async function handleCopyPrompt(item: InspirationItem) {
    if (!item.prompt) {
      notifyError(t('toast_error'));
      return;
    }
    if (!viewer?.authenticated) {
      notifyError(t('home_generation_login_required'));
      openAuthModal('login', '/explore', 'reuse-prompt');
      return;
    }
    const copied = await copyTextToClipboard(item.prompt);
    if (copied) {
      notifySuccess(t('home_prompt_copied'));
    } else {
      notifyError(t('toast_error'));
    }
  }

  function handleStartCreating() {
    if (viewer?.authenticated) {
      setShowCreateWizard(true);
      return;
    }
    openAuthModal('register', '/create', 'generate');
  }

  function handleWizardComplete(result: WizardResult) {
    setShowCreateWizard(false);
    navigate('/create', { state: { wizardResult: result } });
  }

  return (
    <div className="mx-auto min-h-screen max-w-screen-2xl px-4 pb-28 pt-6 lg:pb-6">
      {showCreateWizard ? (
        <CreateFlowWizard
          onComplete={handleWizardComplete}
          onClose={() => setShowCreateWizard(false)}
        />
      ) : null}

      <div className="mb-8 border-b border-white/10 pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3FF74]">{t('explore_eyebrow')}</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#f0ede8] sm:text-5xl">{t('home_title')}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">{t('explore_desc')}</p>
          </div>
          <button
            type="button"
            onClick={handleStartCreating}
            className="btn-primary min-h-11 w-fit px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111110]"
          >
            {t('explore_cta')}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
          <span className="h-px w-8 bg-[#E3FF74]/60" />
          <span>{t('explore_gallery_label')}</span>
        </div>
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
              className="btn-primary h-11 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/45"
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
            <ExploreCard
              item={item}
              index={index}
              onOpen={setSelectedItem}
            />
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
              <div className="mt-1 max-h-24 overflow-y-auto break-words text-xs leading-5 text-on-surface-variant [overflow-wrap:anywhere]">
                {loadErrorMessage || t('toast_error')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadMore({ force: true }).catch(() => undefined)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-error/30 px-3 text-xs font-semibold text-error transition-colors hover:bg-error/15"
            >
              <RefreshCw size={14} />
              {t('history_retry')}
            </button>
          </div>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      <ExploreDetailModal
        item={selectedItem}
        reusePromptAriaLabel={reusePromptAriaLabel}
        reusePromptLabel={reusePromptLabel}
        onClose={() => setSelectedItem(null)}
        onCopyPrompt={(item) => handleCopyPrompt(item).catch(notifyError)}
        onReusePrompt={handleReusePrompt}
      />
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
        <p className="mt-2 max-h-32 overflow-y-auto break-words text-sm leading-6 text-on-surface-variant [overflow-wrap:anywhere]">{description}</p>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

function ExploreCard({
  item,
  index,
  onOpen,
}: {
  item: InspirationItem;
  index: number;
  onOpen: (item: InspirationItem) => void;
}) {
  const ratio = getExploreCardRatio(item.id || item.image_url || String(index));
  const cardStyle: CSSProperties = { aspectRatio: String(ratio) };
  const { t } = useSite();
  const title = item.title || item.section || t('home_title');
  const hasImage = Boolean(item.image_url);

  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-[#14120f] shadow-[inset_0_0_0_1px_rgba(240,237,232,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(227,255,116,0.22)] focus-within:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(227,255,116,0.36)]"
      style={cardStyle}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/80 focus-visible:ring-inset"
        aria-label={`${t('history_preview')} ${title}`}
      >
        {hasImage ? (
          <RetryImage
            src={item.image_url ?? ''}
            alt={title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.035]"
            loading="lazy"
            variant="gallery"
          />
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,rgba(227,255,116,0.08),rgba(254,110,0,0.08),rgba(20,18,15,1))] p-5 text-center text-on-surface-variant">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/25 text-[#E3FF74]">
              <ImageOff size={18} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{t('image_load_failed')}</div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[#E3FF74] opacity-0 transition-opacity duration-200 group-hover:opacity-80 group-focus-within:opacity-80" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/88 via-black/35 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="p-3 sm:p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {item.section ? (
                  <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E3FF74]/80">{item.section}</div>
                ) : null}
                {item.prompt ? (
                  <p className="text-xs leading-relaxed text-white/86 line-clamp-3">
                    {item.prompt}
                  </p>
                ) : null}
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur transition-colors group-hover:border-[#E3FF74]/55 group-hover:text-[#E3FF74]">
                <Maximize2 size={14} />
              </span>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}

function ExploreDetailModal({
  item,
  onClose,
  onCopyPrompt,
  onReusePrompt,
  reusePromptAriaLabel,
  reusePromptLabel,
}: {
  item: InspirationItem | null;
  onClose: () => void;
  onCopyPrompt: (item: InspirationItem) => void;
  onReusePrompt: (item: InspirationItem) => void;
  reusePromptAriaLabel: string;
  reusePromptLabel: string;
}) {
  const { t } = useSite();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = 'explore-detail-title';
  const promptId = 'explore-detail-prompt';
  const title = item?.title || item?.section || t('home_title');
  const canReuse = Boolean(item?.prompt);

  useEffect(() => {
    if (!item) return undefined;
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      (closeButtonRef.current ?? getFocusableElements(dialogRef.current)[0] ?? dialogRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      const previous = previouslyFocusedElementRef.current;
      if (previous && document.contains(previous)) previous.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [item?.id]);

  useEffect(() => {
    if (!item) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableElements = getFocusableElements(dialog);
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!(activeElement instanceof HTMLElement) || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [Boolean(item), onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/72 px-3 py-4 backdrop-blur-sm sm:px-6" onClick={onClose}>
      <div
        ref={dialogRef}
        aria-describedby={item.prompt ? promptId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#14120f] shadow-2xl outline-none md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <div className="relative flex max-h-[46vh] min-h-0 shrink-0 items-center justify-center overflow-auto bg-[#0f0e0c] md:max-h-[92vh] md:shrink">
          {item.image_url ? (
            <RetryImage
              alt={title}
              className="max-h-[44vh] w-auto max-w-full object-contain p-3 sm:p-5 md:max-h-[88vh]"
              src={item.image_url}
              variant="gallery"
            />
          ) : (
            <div className="flex min-h-[42vh] w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,rgba(227,255,116,0.08),rgba(254,110,0,0.08),rgba(20,18,15,1))] p-8 text-center text-on-surface-variant">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-[#E3FF74]">
                <ImageOff size={22} />
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{t('image_load_failed')}</div>
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/10 bg-[#191713] md:max-h-[92vh] md:border-l md:border-t-0">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3FF74]/80">
                {item.section || t('home_title')}
              </div>
              <h2 id={titleId} className="line-clamp-2 break-words text-lg font-bold leading-6 text-[#f0ede8] [overflow-wrap:anywhere]">
                {title}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t('modal_close')}
              title={t('modal_close')}
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-white/10 hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/80"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              {t('prompt_editor_title')}
            </div>
            <p id={promptId} className="whitespace-pre-wrap break-words text-sm leading-6 text-[#f0ede8]/86 [overflow-wrap:anywhere]">
              {item.prompt || t('explore_desc')}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_44px] gap-2 border-t border-white/10 p-4 sm:p-5">
            <button
              type="button"
              onClick={() => onReusePrompt(item)}
              disabled={!canReuse}
              aria-label={reusePromptAriaLabel}
              className="btn-primary h-11 min-w-0 justify-between gap-2 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#191713] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <PenLine size={15} className="shrink-0" />
                <span className="truncate">{reusePromptLabel}</span>
              </span>
              <ArrowRight size={15} className="shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onCopyPrompt(item)}
              disabled={!canReuse}
              aria-label={`${t('prompt_editor_copy')} ${title}`}
              title={t('prompt_editor_copy')}
              className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/75 transition-colors hover:border-[#E3FF74]/45 hover:bg-[#E3FF74]/10 hover:text-[#E3FF74] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={15} />
              <span className="sr-only">{t('prompt_editor_copy')}</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const isVisible = element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
    return isVisible && !element.getAttribute('aria-hidden');
  });
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
