import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, Download, Trash2, RefreshCw, ArrowDown, Loader2, Maximize2, Archive, AlertCircle, LogIn, Sparkles, X, ImageOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteHistory, formatDate, generateImage, getHistory, HistoryItem, taskDownloadUrl } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { Button, IconButton } from '../components/design-system';
import ImagePreviewModal from '../components/ImagePreviewModal';
import MasonryGrid from '../components/MasonryGrid';
import RetryImage from '../components/RetryImage';
import { groupHistoryItems, HistoryGroup, mergeHistoryItems } from '../historyGroups';
import { useNotifier } from '../notifications';
import { useSite } from '../site';
import { useTasks } from '../tasks';

const getColorClasses = (colorMode: string) => {
  if (colorMode === 'primary') {
    return {
      borderHover: 'hover:border-primary/50',
      textId: 'text-primary',
      bgTag: 'bg-primary-container border-primary/30',
      btnBg: 'bg-primary border-primary',
      btnText: 'text-on-primary hover:bg-primary/90',
      btnShadow: ''
    };
  }
  return {
    borderHover: 'hover:border-secondary/50',
    textId: 'text-secondary',
    bgTag: 'bg-secondary-container border-secondary/30',
    btnBg: 'bg-secondary border-secondary',
    btnText: 'text-on-secondary hover:bg-secondary/90',
    btnShadow: ''
  };
};

const HISTORY_PAGE_SIZE = 24;

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
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
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

function HistoryLoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-live="polite">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-low/70"
          key={index}
        >
          <div className="aspect-[4/5] animate-skeleton bg-[linear-gradient(110deg,rgba(240,237,232,0.04),rgba(227,255,116,0.12),rgba(240,237,232,0.04))] bg-[length:220%_100%]" />
          <div className="space-y-3 border-t border-white/10 p-4">
            <div className="h-3 w-1/2 animate-skeleton rounded-full bg-white/15" />
            <div className="h-3 w-full animate-skeleton rounded-full bg-white/10" />
            <div className="h-3 w-4/5 animate-skeleton rounded-full bg-white/10" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-10 animate-skeleton rounded-lg bg-white/10" />
              <div className="h-10 animate-skeleton rounded-lg bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function History() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const { addTask, openDrawer, taskHistoryItems } = useTasks();
  const { notifyError, notifySuccess } = useNotifier();
  const navigate = useNavigate();
  const loadRequestRef = useRef(0);
  const searchDebounceRef = useRef<number | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const isAuthenticated = Boolean(viewer?.authenticated);

  async function load(nextOffset = 0, append = false, searchQuery = submittedQuery) {
    const requestId = ++loadRequestRef.current;
    if (!viewer?.authenticated) {
      setItems([]);
      setOffset(0);
      setHasMore(false);
      setLoadError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getHistory({ limit: HISTORY_PAGE_SIZE, offset: nextOffset, q: searchQuery.trim() || undefined });
      if (requestId !== loadRequestRef.current) {
        return;
      }
      if (!append) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      setItems((current) => (append ? [...current, ...data.items] : data.items));
      if (!append) {
        setRemovedIds([]);
      }
      setOffset(nextOffset + data.items.length);
      setHasMore(data.items.length === HISTORY_PAGE_SIZE);
    } catch (err) {
      if (requestId !== loadRequestRef.current) {
        return;
      }
      setLoadError(true);
      setHasMore(false);
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
      setQuery('');
      setSubmittedQuery('');
      setRemovedIds([]);
      setPreviewItem(null);
      load(0, false, '').catch(() => undefined);
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

  async function handleDelete(group: HistoryGroup) {
    const ids = group.items.map((item) => item.id);
    try {
      await Promise.all(ids.map((id) => deleteHistory(id)));
      setItems((current) => current.filter((item) => !ids.includes(item.id)));
      setRemovedIds((current) => [...new Set([...current, ...ids])]);
      notifySuccess(t('toast_success'));
    } catch (err) {
      notifyError(err);
      throw err;
    }
  }

  async function handleRegenerate(group: HistoryGroup) {
    const item = group.first;
    setLoading(true);
    try {
      const submittedTask = await generateImage({
        prompt: item.prompt,
        size: item.size,
        aspect_ratio: item.aspect_ratio,
        quality: item.quality,
        n: group.images.length > 1 ? group.images.length : undefined,
      });
      addTask(submittedTask);
      openDrawer();
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  const activeSearch = submittedQuery.trim();
  const normalizedSearch = activeSearch.toLowerCase();
  const visibleGroups = groupHistoryItems(
    mergeHistoryItems([...taskHistoryItems, ...items])
      .filter((item) => !removedIds.includes(item.id))
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }
        return [item.prompt, item.task_prompt, item.revised_prompt, item.error]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      }),
  );
  const hasSearch = activeSearch.length > 0;

  function handleApplySearch() {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    load(0, false, nextQuery).catch(() => undefined);
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

  function openPreview(group: HistoryGroup, imageId?: string) {
    if (group.images.length === 0) {
      return;
    }
    const initialIndex = imageId
      ? Math.max(0, group.images.findIndex((image) => image.id === imageId))
      : 0;
    setPreviewItem({
      images: group.images.map((galleryImage, galleryIndex) => ({
        id: galleryImage.id,
        url: galleryImage.url,
        prompt: galleryImage.prompt,
        title: `${group.title}-${galleryIndex + 1}`,
      })),
      initialIndex,
      prompt: group.taskPrompt,
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-white/10 pb-6">
        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-2 text-[10px] text-primary uppercase font-bold tracking-widest">
              <span className="w-4 h-[1px] bg-primary"></span> {t('history_tag')}
           </div>
          <h1 className="text-4xl md:text-5xl text-on-surface font-bold tracking-tighter">{t('history_title')}</h1>
          <p className="text-white/50 text-sm">{t('history_subtitle')}</p>
        </div>

        {isAuthenticated ? (
          <div className="flex gap-3 w-full md:w-auto">
            <label className="relative flex-1 md:w-72">
              <span className="sr-only">{t('history_search')}</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleApplySearch();
                  }
                }}
                className="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-low py-2 pl-10 pr-12 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary"
                placeholder={t('history_search')}
                type="text"
              />
              {query.trim() ? (
                <IconButton
                  aria-label={t('history_clear_search')}
                  className="absolute right-0 top-1/2 -translate-y-1/2"
                  icon={<X size={14} aria-hidden="true" />}
                  label={t('history_clear_search')}
                  onClick={handleClearSearch}
                  variant="plain"
                />
              ) : null}
            </label>
          </div>
        ) : (
          <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant/70 bg-surface-container-low px-4 text-sm text-on-surface-variant">
            <LogIn size={16} className="text-primary/70" />
            {t('history_login_title')}
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <WorkSurfaceState
          accent="primary"
          description={t('history_login_desc')}
          icon={<LogIn size={24} />}
          title={t('history_login_title')}
          action={(
            <Button variant="primary" iconStart={<LogIn size={16} aria-hidden="true" />} type="button" onClick={() => openAuthModal('login', '/history', 'history')}>
              {t('top_login')}
            </Button>
          )}
        />
      ) : loadError && visibleGroups.length === 0 ? (
        <WorkSurfaceState
          accent="error"
          description={t('history_error_desc')}
          icon={<AlertCircle size={24} />}
          title={t('history_error_title')}
          action={(
            <Button variant="primary" iconStart={<RefreshCw size={16} aria-hidden="true" />} type="button" onClick={() => load(0, false).catch(() => undefined)}>
              {t('history_retry')}
            </Button>
          )}
        />
      ) : loading && visibleGroups.length === 0 ? (
        <HistoryLoadingGrid />
      ) : visibleGroups.length === 0 ? (
        <WorkSurfaceState
          accent={hasSearch ? 'secondary' : 'primary'}
          description={hasSearch ? t('history_search_empty_desc') : t('history_empty_desc')}
          icon={hasSearch ? <Search size={24} /> : <Sparkles size={24} />}
          title={hasSearch ? t('history_search_empty_title') : t('history_empty_title')}
          action={hasSearch ? (
            <Button
              variant="ghost"
              iconStart={<X size={16} aria-hidden="true" />}
              type="button"
              onClick={handleClearSearch}
            >
              {t('history_clear_search')}
            </Button>
          ) : (
            <Button variant="primary" iconStart={<Sparkles size={16} aria-hidden="true" />} type="button" onClick={() => navigate('/create')}>
              {t('history_create_action')}
            </Button>
          )}
        />
      ) : (
        <>
          <MasonryGrid
            items={visibleGroups}
            getKey={(group) => group.key}
            renderItem={(group, index) => (
              <HistoryCard
                group={group}
                index={index}
                onDelete={() => handleDelete(group)}
                onPreview={(imageId) => openPreview(group, imageId)}
                onRegenerate={() => handleRegenerate(group)}
              />
            )}
          />

          {hasMore ? (
            <div className="mt-12 flex justify-center">
              <Button
                variant="ghost"
                iconStart={<ArrowDown size={14} aria-hidden="true" />}
                onClick={() => load(offset, true)}
                disabled={loading}
                loading={loading}
              >
                {t('history_load_more')}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ImagePreviewModal
        imageUrl={previewItem?.imageUrl || null}
        images={previewItem?.images}
        initialIndex={previewItem?.initialIndex || 0}
        alt={previewItem?.prompt || 'preview'}
        subtitle={previewItem?.prompt}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

function HistoryCard({
  group,
  index,
  onDelete,
  onPreview,
  onRegenerate,
}: {
  group: HistoryGroup;
  index: number;
  onDelete: () => Promise<void>;
  onPreview: (imageId?: string) => void;
  onRegenerate: () => void;
}) {
  const { t } = useSite();
  const cancelDeleteRef = useRef<HTMLButtonElement | null>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const deleteDialogTitleId = useId();
  const deleteDialogDescId = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const item = group.first;
  const colors = getColorClasses(index % 2 === 0 ? 'primary' : 'secondary');
  const isBatch = group.items.length > 1;
  const deleteCount = group.items.length;
  const previewImage = group.images[0]?.url || item.image_url;
  const issueCount = group.items.filter((historyItem) => historyItem.status === 'failed' || !historyItem.image_url).length;
  const errorText = group.items.find((historyItem) => historyItem.error)?.error || (issueCount > 0 ? t('history_failed') : '');
  const visibleSlots = isBatch ? group.items.slice(0, 6) : [item];
  const hiddenSlotCount = Math.max(0, group.items.length - visibleSlots.length);
  const downloadHref = isBatch && item.task_id ? taskDownloadUrl(item.task_id) : previewImage || '';
  const downloadLabel = isBatch ? t('history_download_zip') : t('history_download');
  const downloadIcon = isBatch ? <Archive size={14} /> : <Download size={14} />;
  const deleteTitle = deleteCount === 1
    ? t('history_delete_title_one')
    : t('history_delete_title_many', { count: deleteCount });
  const deleteConsequence = deleteCount === 1
    ? t('history_delete_consequence_one')
    : t('history_delete_consequence_many', { count: deleteCount });
  const deleteConfirmLabel = deleteCount === 1
    ? t('history_delete_confirm_one')
    : t('history_delete_confirm_many', { count: deleteCount });

  useEffect(() => {
    if (!confirmingDelete) {
      return undefined;
    }

    cancelDeleteRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) {
        event.preventDefault();
        closeDeleteConfirm();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = [cancelDeleteRef.current, confirmDeleteRef.current].filter(
        (element): element is HTMLButtonElement => Boolean(element) && !element.disabled,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmingDelete, deleting]);

  function closeDeleteConfirm() {
    if (deleting) {
      return;
    }
    setConfirmingDelete(false);
    window.setTimeout(() => deleteButtonRef.current?.focus(), 0);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete();
      setConfirmingDelete(false);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-lg border border-white/10 bg-black/80 ${colors.borderHover} transition-all duration-300`}
    >
      <div className={isBatch ? 'grid grid-cols-3 gap-1 bg-black p-1' : 'bg-black'}>
        {visibleSlots.map((slot, slotIndex) => {
          const hasImage = Boolean(slot.image_url);
          const hiddenLabel = hiddenSlotCount > 0 && slotIndex === visibleSlots.length - 1 ? `+${hiddenSlotCount}` : null;
          if (hasImage) {
            // TODO(F2): keep raw button because this wraps the full masonry media preview; Button's text wrapper changes the image overlay layout.
            return (
              <button
                key={slot.id}
                aria-label={`${t('history_preview')} ${slotIndex + 1}`}
                className={`group relative block w-full cursor-zoom-in overflow-hidden bg-black text-left ${
                  isBatch ? 'aspect-square' : ''
                }`}
                type="button"
                onClick={() => onPreview(slot.id)}
                title={t('history_preview')}
              >
                <RetryImage
                  alt={slot.prompt}
                  className={isBatch ? 'h-full w-full object-cover opacity-95 transition-opacity duration-300 group-hover:opacity-100' : 'block h-auto w-full opacity-95 transition-opacity duration-300 group-hover:opacity-100'}
                  loading="lazy"
                  src={slot.image_url}
                />
                <span className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/55 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Maximize2 size={12} />
                    {t('history_preview')}
                  </span>
                  {hiddenLabel ? <span className="shrink-0 text-lime">{hiddenLabel}</span> : null}
                </span>
              </button>
            );
          }

          return (
            <div
              className={`relative flex min-h-48 flex-col items-center justify-center overflow-hidden bg-[#14120f] px-4 py-6 text-center ${
                isBatch ? 'aspect-square min-h-0' : ''
              }`}
              key={slot.id}
              role="img"
              aria-label={slot.status === 'failed' ? t('history_failed') : t('image_load_failed')}
              title={slot.status === 'failed' ? t('history_failed') : t('image_load_failed')}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-error/20 bg-error/10 text-error">
                {slot.status === 'failed' ? <AlertCircle size={19} /> : <ImageOff size={19} />}
              </div>
              {isBatch ? null : (
                <div className="mt-3 w-full max-w-full break-words text-[11px] font-bold uppercase tracking-wider text-error/80">
                  {slot.status === 'failed' ? t('history_failed') : t('image_load_failed')}
                </div>
              )}
              {slot.error && !isBatch ? (
                <div className="mt-2 line-clamp-3 max-w-full break-words text-[11px] leading-4 text-white/45">
                  {slot.error}
                </div>
              ) : null}
              {hiddenLabel ? <div className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-lime">{hiddenLabel}</div> : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 bg-surface-container-low/90 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-white/40">
          <span className={colors.textId}>ID:{item.id.slice(0, 4).toUpperCase()}</span>
          <span>{formatDate(item.created_at)}</span>
          <span>{item.size}</span>
          {item.aspect_ratio ? <span>{item.aspect_ratio}</span> : null}
          {isBatch ? <span>{group.images.length}/{group.items.length}</span> : null}
          {issueCount > 0 ? <span className="text-error">{issueCount} {t('history_failed')}</span> : null}
        </div>
        <p className={`mb-3 line-clamp-4 break-words text-sm leading-6 ${colors.textId} transition-colors`}>
          {group.taskPrompt}
        </p>
        {errorText ? (
          <div className="mb-3 flex gap-2 rounded-lg border border-error/20 bg-error/10 p-3 text-xs leading-5 text-error/90">
            <AlertCircle className="mt-0.5 shrink-0" size={14} />
            <span className="min-w-0 break-words line-clamp-4">{errorText}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2">
          {downloadHref ? (
            <a
              aria-label={downloadLabel}
              className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-bold uppercase tracking-wide text-white transition-all hover:border-primary hover:text-primary"
              download={!isBatch}
              href={downloadHref}
              title={downloadLabel}
            >
              {downloadIcon}
              <span>{downloadLabel}</span>
            </a>
          ) : (
            <Button
              aria-label={downloadLabel}
              disabled
              fullWidth
              iconStart={downloadIcon}
              type="button"
              title={downloadLabel}
              variant="ghost"
            >
              {downloadLabel}
            </Button>
          )}
          <Button
            onClick={onRegenerate}
            className="uppercase tracking-wide"
            fullWidth
            iconStart={<RefreshCw size={14} aria-hidden="true" />}
            type="button"
            variant={index % 2 === 0 ? 'primary' : 'orange'}
          >
            {t('history_regenerate')}
          </Button>
        </div>

        <div className="mt-3 flex justify-end border-t border-white/10 pt-3">
          <IconButton
            ref={deleteButtonRef}
            aria-label={t('history_delete')}
            onClick={() => setConfirmingDelete(true)}
            disabled={confirmingDelete || deleting}
            icon={<Trash2 size={14} aria-hidden="true" />}
            label={t('history_delete')}
            variant="danger"
          />
        </div>

        {confirmingDelete ? (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-6 backdrop-blur-sm sm:items-center sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeDeleteConfirm();
              }
            }}
          >
            <div
              aria-describedby={deleteDialogDescId}
              aria-labelledby={deleteDialogTitleId}
              aria-modal="true"
              className="flex max-h-[min(82vh,28rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-error/40 bg-surface-container-low shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:rounded-2xl"
              role="alertdialog"
            >
              <div className="flex min-h-0 flex-1 items-start gap-3 overflow-y-auto p-4 sm:p-5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error text-on-error">
                  <Trash2 size={16} />
                </div>
                <div className="min-w-0">
                  <h2
                    className="break-words text-base font-semibold leading-6 text-error [overflow-wrap:anywhere]"
                    id={deleteDialogTitleId}
                  >
                    {deleteTitle}
                  </h2>
                  <p
                    className="mt-2 break-words text-sm leading-6 text-on-surface-variant [overflow-wrap:anywhere]"
                    id={deleteDialogDescId}
                  >
                    {deleteConsequence}
                  </p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-outline-variant/70 bg-surface-container px-4 py-3 sm:grid-cols-2 sm:p-4">
                <Button
                  ref={cancelDeleteRef}
                  variant="ghost"
                  fullWidth
                  type="button"
                  disabled={deleting}
                  onClick={closeDeleteConfirm}
                >
                  {t('history_delete_cancel')}
                </Button>
                <Button
                  ref={confirmDeleteRef}
                  variant="danger"
                  fullWidth
                  className="uppercase"
                  iconStart={<Trash2 size={14} aria-hidden="true" />}
                  type="button"
                  disabled={deleting}
                  onClick={() => confirmDelete().catch(() => undefined)}
                  loading={deleting}
                >
                  {deleteConfirmLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
