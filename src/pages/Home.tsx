import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ArrowUp, Heart, ImagePlus, Maximize2, Minimize2, RefreshCw, Loader2, Search, Sparkles, X } from 'lucide-react';
import {
  editImage,
  favoriteInspiration,
  generateImage,
  getConfig,
  getHistory,
  getInspirations,
  HistoryItem,
  InspirationItem,
  optimizePrompt,
  searchInspirationsWithAI,
  unfavoriteInspiration,
} from '../api';
import { useAuth } from '../auth';
import { copyTextToClipboard } from '../clipboard';
import ImagePreviewModal from '../components/ImagePreviewModal';
import MasonryGrid from '../components/MasonryGrid';
import ModelBadge from '../components/ModelBadge';
import PromptEditorModal from '../components/PromptEditorModal';
import RetryImage from '../components/RetryImage';
import { useHomeFeed } from '../homeFeed';
import { groupHistoryItems, mergeHistoryItems } from '../historyGroups';
import { createReferenceEntry, REFERENCE_ROLE_OPTIONS, ReferenceImageEntry } from '../referenceImages';
import { useNotifier } from '../notifications';
import {
  ASPECT_RATIO_OPTIONS,
  IMAGE_COUNT_OPTIONS,
  isSupportedImagePreset,
  providerImageSize,
  QUALITY_OPTIONS,
  SIZE_LABELS,
  SIZE_OPTIONS,
} from '../imageOptions';
import { useSite } from '../site';
import { useTasks } from '../tasks';
import GenerationSelect from '../components/GenerationSelect';

const FEED_PAGE_SIZE = 24;
const PROMPT_TRANSFER_KEY = 'joko_pending_prompt';

function groupHistoryForFeed(items: HistoryItem[]): FeedItem[] {
  return groupHistoryItems(items)
    .filter((group) => group.images.length > 0)
    .map((group) => ({
      key: `history-${group.key}`,
      id: `ID:${group.first.id.slice(0, 4).toUpperCase()}`,
      img: group.images[0].url,
      images: group.images.map((image) => ({ id: image.id, url: image.url, prompt: image.prompt })),
      prompt: group.taskPrompt,
      title: group.title,
      inspirationId: null,
      favorited: false,
    }));
}

type FeedItem = {
  key: string;
  id: string;
  img: string;
  images: { id: string; url: string; prompt: string }[];
  prompt: string;
  title: string;
  inspirationId: string | null;
  favorited: boolean;
};

export default function Home() {
  const { viewer } = useAuth();
  const { t } = useSite();
  const { addTask, openDrawer, taskHistoryItems } = useTasks();
  const { notifyError, notifySuccess, notifyInfo } = useNotifier();
  const { state: feedState, patchState, setState: setFeedState } = useHomeFeed();
  const [promptValue, setPromptValue] = useState('');
  const [promptInstruction, setPromptInstruction] = useState('');
  const [selectedReferences, setSelectedReferences] = useState<ReferenceImageEntry[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<{ id: string; name: string; url: string }[]>([]);
  const [imageScale, setImageScale] = useState('FAST');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageQuality, setImageQuality] = useState('auto');
  const [imageCount, setImageCount] = useState('1');
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);
  const [generationPanelExpanded, setGenerationPanelExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optimizingPrompt, setOptimizingPrompt] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [draggingReference, setDraggingReference] = useState(false);
  const [favoritePendingIds, setFavoritePendingIds] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const {
    history,
    inspirations,
    feedLoading,
    loadingMoreFeed,
    hasMoreInspirations,
    inspirationOffset,
    inspirationTotal,
    inspirationSearchInput,
    inspirationQuery,
    inspirationSearchMode,
    inspirationAIQuery,
  } = feedState;

  useEffect(() => {
    const pendingPrompt = window.sessionStorage.getItem(PROMPT_TRANSFER_KEY);
    if (pendingPrompt) {
      setPromptValue(pendingPrompt);
      setGenerationPanelExpanded(true);
      window.sessionStorage.removeItem(PROMPT_TRANSFER_KEY);
    }
  }, []);

  useEffect(() => {
    const previews = selectedReferences.map((reference) => ({
      id: reference.id,
      name: reference.file.name,
      url: URL.createObjectURL(reference.file),
    }));
    setSelectedPreviews(previews);
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [selectedReferences]);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((config) => {
        if (cancelled) return;
        setImageQuality(config.default_quality || 'auto');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [viewer?.owner_id]);

  useEffect(() => {
    if (!isSupportedImagePreset(imageScale, aspectRatio)) {
      setImageScale('FAST');
    }
  }, [aspectRatio, imageScale]);

  useEffect(() => {
    if (inspirationSearchMode === 'ai') {
      return;
    }
    const handle = window.setTimeout(() => {
      patchState({ inspirationQuery: inspirationSearchInput.trim() });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [inspirationSearchInput, inspirationSearchMode, patchState]);

  useEffect(() => {
    const updateBackToTop = () => setShowBackToTop(window.scrollY > 720);
    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    return () => window.removeEventListener('scroll', updateBackToTop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ownerId = viewer?.owner_id || '';
    const query = inspirationQuery || undefined;
    if (
      feedState.initialized &&
      feedState.loadedOwnerId === ownerId &&
      feedState.loadedQuery === (query || '') &&
      feedState.loadedSearchMode === inspirationSearchMode
    ) {
      return () => {
        cancelled = true;
      };
    }
    patchState({
      feedLoading: true,
      loadingMoreFeed: false,
      hasMoreInspirations: true,
      inspirationOffset: 0,
      inspirationTotal: 0,
      inspirations: [],
    });
    const inspirationTask = inspirationSearchMode === 'ai' && query
      ? searchInspirationsWithAI({ limit: FEED_PAGE_SIZE, offset: 0, query })
      : getInspirations({ limit: FEED_PAGE_SIZE, offset: 0, q: query });
    const task = Promise.all([getHistory({ limit: 12 }), inspirationTask]);
    task
      .then(([historyData, inspirationData]) => {
        if (cancelled) return;
        const nextTotal = Number(inspirationData.total ?? inspirationData.items.length ?? 0);
        patchState({
          history: historyData.items.filter((item) => item.status === 'succeeded' && Boolean(item.image_url)),
          inspirations: inspirationData.items,
          inspirationTotal: nextTotal,
          inspirationOffset: inspirationData.items.length,
          hasMoreInspirations: inspirationData.items.length < nextTotal,
          loadedOwnerId: ownerId,
          loadedQuery: query || '',
          inspirationAIQuery: 'query' in inspirationData && inspirationSearchMode === 'ai' ? inspirationData.query : '',
          loadedSearchMode: inspirationSearchMode,
          initialized: true,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          notifyError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          patchState({ feedLoading: false });
          if (inspirationSearchMode === 'ai') {
            setAiSearching(false);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    feedState.initialized,
    feedState.loadedOwnerId,
    feedState.loadedQuery,
    feedState.loadedSearchMode,
    inspirationQuery,
    inspirationSearchMode,
    notifyError,
    patchState,
    viewer?.owner_id,
  ]);

  const loadMoreInspirations = useCallback(async () => {
    if (feedLoading || loadingMoreFeed || !hasMoreInspirations) {
      return;
    }
    patchState({ loadingMoreFeed: true });
    try {
      const query = inspirationSearchMode === 'ai' ? inspirationAIQuery || inspirationQuery || undefined : inspirationQuery || undefined;
      const data = await getInspirations({
        limit: FEED_PAGE_SIZE,
        offset: inspirationOffset,
        q: query,
      });
      setFeedState((current) => {
        const seen = new Set(current.inspirations.map((item) => item.id));
        const nextItems = data.items.filter((item) => !seen.has(item.id));
        const nextOffset = inspirationOffset + data.items.length;
        const nextTotal = Number(data.total ?? inspirationTotal);
        return {
          ...current,
          inspirations: [...current.inspirations, ...nextItems],
          inspirationTotal: nextTotal,
          inspirationOffset: nextOffset,
          hasMoreInspirations: nextTotal > 0 ? nextOffset < nextTotal : data.items.length === FEED_PAGE_SIZE,
        };
      });
    } catch (err) {
      notifyError(err);
    } finally {
      patchState({ loadingMoreFeed: false });
    }
  }, [
    feedLoading,
    hasMoreInspirations,
    inspirationAIQuery,
    inspirationOffset,
    inspirationQuery,
    inspirationSearchMode,
    inspirationTotal,
    loadingMoreFeed,
    notifyError,
    patchState,
    setFeedState,
  ]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || feedLoading || loadingMoreFeed || !hasMoreInspirations) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreInspirations().catch(() => undefined);
        }
      },
      { rootMargin: '480px 0px', threshold: 0.01 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [feedLoading, hasMoreInspirations, loadMoreInspirations, loadingMoreFeed]);

  useEffect(() => {
    const initialScrollY = feedState.scrollY;
    window.requestAnimationFrame(() => {
      if (initialScrollY > 0) {
        window.scrollTo({ top: initialScrollY, behavior: 'auto' });
      }
    });
    return () => {
      patchState({ scrollY: window.scrollY });
    };
  }, [patchState]);

  async function handleExecute() {
    const prompt = promptValue.trim();
    if (!prompt) return;
    if (loading) return;
    if (!viewer?.authenticated) {
      setGenerationPanelExpanded(true);
      notifyError(t('home_generation_login_required'));
      return;
    }
    setLoading(true);
    const requestedImageCount = Math.max(1, Math.min(9, Number(imageCount) || 1));
    const imageOptions = {
      size: providerImageSize(imageScale, aspectRatio),
      aspect_ratio: aspectRatio,
      quality: imageQuality,
    };
    try {
      const isEditMode = selectedReferences.length > 0;
      const sentMessage = isEditMode ? t('home_message_edit_sent') : t('home_message_generate_sent');
      setMessage(sentMessage);
      notifyInfo(sentMessage);
      const submittedTask = isEditMode
        ? await editImage(
            { prompt, ...imageOptions, n: requestedImageCount },
            selectedReferences.map((reference) => ({
              file: reference.file,
              role: reference.role,
              note: reference.note,
            })),
          )
        : await generateImage({ prompt, ...imageOptions, n: requestedImageCount });
      setSelectedReferences([]);
      addTask(submittedTask);
      openDrawer();
      const nextMessage = submittedTask.status === 'running' ? t('home_message_processing') : t('home_message_queued');
      setMessage(nextMessage);
      notifyInfo(nextMessage);
    } catch (err) {
      notifyError(err);
      setMessage('');
    } finally {
      setLoading(false);
    }
  }

  async function handleOptimizePrompt() {
    const prompt = promptValue.trim();
    if (!prompt || optimizingPrompt) {
      if (!prompt) notifyError(t('home_prompt_optimizer_empty'));
      return;
    }
    setOptimizingPrompt(true);
    const optimizingMessage = t('home_optimizing_prompt');
    setMessage(optimizingMessage);
    notifyInfo(optimizingMessage);
    try {
      const result = await optimizePrompt({
        prompt,
        instruction: promptInstruction.trim() || undefined,
        size: providerImageSize(imageScale, aspectRatio),
        aspect_ratio: aspectRatio,
        quality: imageQuality,
      });
      setPromptValue(result.prompt);
      const optimizedMessage = t('home_prompt_optimized');
      setMessage(optimizedMessage);
      notifySuccess(optimizedMessage);
    } catch (err) {
      notifyError(err);
      setMessage('');
    } finally {
      setOptimizingPrompt(false);
    }
  }

  async function handleAISearch() {
    const query = inspirationSearchInput.trim();
    if (!query || aiSearching) {
      return;
    }
    setAiSearching(true);
    patchState({
      inspirationSearchMode: 'ai',
      inspirationQuery: query,
      inspirationAIQuery: '',
      feedLoading: true,
      initialized: false,
    });
  }

  function setKeywordSearchMode() {
    patchState({
      inspirationSearchMode: 'keyword',
      inspirationAIQuery: '',
      inspirationQuery: inspirationSearchInput.trim(),
      initialized: false,
    });
  }

  async function handleToggleFavorite(item: FeedItem) {
    if (!item.inspirationId) return;
    if (!viewer?.authenticated) {
      notifyError(t('home_favorite_login_required'));
      return;
    }
    setFavoritePendingIds((current) => (current.includes(item.inspirationId!) ? current : [...current, item.inspirationId!]));
    try {
      const result = item.favorited
        ? await unfavoriteInspiration(item.inspirationId)
        : await favoriteInspiration(item.inspirationId);
      setFeedState((current) => ({
        ...current,
        inspirations: current.inspirations.map((inspiration) => (inspiration.id === result.item.id ? result.item : inspiration)),
      }));
      const favoriteMessage = result.item.favorited ? t('home_favorite_saved') : t('home_favorite_removed');
      setMessage(favoriteMessage);
      notifySuccess(favoriteMessage);
    } catch (err) {
      notifyError(err);
    } finally {
      setFavoritePendingIds((current) => current.filter((id) => id !== item.inspirationId));
    }
  }

  async function handleClonePrompt(prompt: string) {
    setPromptValue(prompt);
    setGenerationPanelExpanded(true);
    await copyTextToClipboard(prompt);
    const copiedMessage = t('home_prompt_copied');
    setMessage(copiedMessage);
    notifySuccess(copiedMessage);
  }

  async function handleCopyPrompt() {
    if (!promptValue.trim()) {
      return;
    }
    await copyTextToClipboard(promptValue);
    const copiedMessage = t('home_prompt_copied');
    setMessage(copiedMessage);
    notifySuccess(copiedMessage);
  }

  const mergedHistory = mergeHistoryItems([
    ...taskHistoryItems.filter((item) => item.status === 'succeeded' && Boolean(item.image_url)),
    ...history,
  ]);

  const generatedFeed: FeedItem[] = groupHistoryForFeed(mergedHistory);
  const inspirationFeed: FeedItem[] = inspirations.map((item) => ({
    key: `case-${item.id}`,
    id: item.author || item.section,
    img: item.image_url || '',
    images: item.image_url ? [{ id: item.id, url: item.image_url, prompt: item.prompt }] : [],
    prompt: item.prompt,
    title: item.title,
    inspirationId: item.id,
    favorited: item.favorited,
  }));
  const hasSearchInput = inspirationSearchInput.trim().length > 0;
  const visibleFeed = [...(hasSearchInput ? [] : generatedFeed), ...inspirationFeed].filter((item) => item.img);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleAspectRatioChange = (nextRatio: string) => {
    setAspectRatio(nextRatio);
    if (nextRatio === '1:1' && imageScale === '4K') {
      setImageScale('2K');
    }
  };
  const getDroppedImages = (files: File[]) => files.filter((file) => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type));
  const addReferenceFiles = useCallback(
    (files: File[]) => {
      const imageFiles = getDroppedImages(files);
      if (imageFiles.length === 0) {
        notifyError(t('home_ref_image_invalid'));
        return;
      }
      setSelectedReferences((current) => [...current, ...imageFiles.map((file) => createReferenceEntry(file))].slice(0, 8));
      setGenerationPanelExpanded(true);
      const editMessage = t('home_mode_edit');
      setMessage(editMessage);
      notifyInfo(editMessage);
    },
    [notifyError, notifyInfo, t],
  );
  const handleReferenceImages = (event: ChangeEvent<HTMLInputElement>) => {
    addReferenceFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };
  const handleReferenceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes('Files')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDraggingReference(true);
  };
  const handleReferenceDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDraggingReference(false);
    }
  };
  const handleReferenceDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggingReference(false);
    const files = Array.from(event.dataTransfer.files || []);
    addReferenceFiles(files);
  };
  const removeReferenceImage = (index: number) => {
    setSelectedReferences((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };
  const updateReferenceImage = (index: number, patch: Partial<Pick<ReferenceImageEntry, 'role' | 'note'>>) => {
    setSelectedReferences((current) =>
      current.map((reference, currentIndex) => (currentIndex === index ? { ...reference, ...patch } : reference)),
    );
  };

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-primary font-medium mb-1">
            <span className="w-4 h-[1px] bg-primary" /> {t('home_title')}
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{t('home_title')}</h1>
          <div className="flex items-center gap-3 mt-1">
            <ModelBadge />
            <span className="text-xs text-on-surface-variant">
              {viewer?.authenticated
                ? t('home_owner', { value: viewer.user?.username || viewer.user?.email || '--' })
                : t('home_guest', { value: viewer?.guest_id?.slice(0, 8) || '--' })}
            </span>
          </div>
        </div>
      </div>

      {/* Generation Panel — moved to top of page */}
      <div
        className={`mb-6 rounded-xl border bg-surface transition-all ${
          generationPanelExpanded ? 'p-4' : 'p-3'
        } ${
          draggingReference ? 'border-primary border-2' : 'border-outline-variant'
        }`}
        onDragEnter={handleReferenceDragOver}
        onDragLeave={handleReferenceDragLeave}
        onDragOver={handleReferenceDragOver}
        onDrop={handleReferenceDrop}
      >
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleReferenceImages}
        />
        <div className={`${generationPanelExpanded ? 'mb-3' : ''} flex items-center gap-3`}>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            {t('home_mode')}: {selectedReferences.length ? t('home_mode_edit') : t('home_mode_generate')}
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-on-surface-variant">
            <span>{SIZE_LABELS[imageScale] || imageScale}</span>
            <span>{aspectRatio}</span>
            <span>{providerImageSize(imageScale, aspectRatio)}</span>
            <span>{imageQuality}</span>
            {Number(imageCount) > 1 ? <span>x{imageCount}</span> : null}
          </div>
          <div className="flex-1 min-w-0">
            <button
              type="button"
              className="w-full text-left text-xs text-on-surface-variant truncate hover:text-primary transition-colors"
              onClick={() => setGenerationPanelExpanded(true)}
            >
              {message || (promptValue ? promptValue : t('home_message_waiting'))}
            </button>
          </div>
          {!generationPanelExpanded ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                title={t('home_ref_image')}
              >
                <ImagePlus size={15} />
              </button>
              <button
                onClick={handleExecute}
                disabled={loading || !promptValue.trim()}
                className="flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={15} /> : t('home_execute')}
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                title={t('home_panel_expand')}
                aria-label={t('home_panel_expand')}
                onClick={() => setGenerationPanelExpanded(true)}
              >
                <Maximize2 size={15} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              title={t('home_panel_collapse')}
              aria-label={t('home_panel_collapse')}
              onClick={() => setGenerationPanelExpanded(false)}
            >
              <Minimize2 size={14} />
            </button>
          )}
        </div>

        {generationPanelExpanded ? (
          <>
            <div className="mb-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-4 lg:grid-cols-[128px_112px_104px_84px_1fr_auto]">
              <GenerationSelect
                label={t('home_size')}
                value={imageScale}
                onChange={setImageScale}
                options={SIZE_OPTIONS}
                getOptionLabel={(option) => SIZE_LABELS[option] || option}
                isOptionDisabled={(option) => !isSupportedImagePreset(option, aspectRatio)}
              />
              <GenerationSelect label={t('home_aspect_ratio')} value={aspectRatio} onChange={handleAspectRatioChange} options={ASPECT_RATIO_OPTIONS} />
              <GenerationSelect label={t('home_quality')} value={imageQuality} onChange={setImageQuality} options={QUALITY_OPTIONS} />
              <GenerationSelect
                label={t('home_image_count')}
                value={imageCount}
                onChange={setImageCount}
                options={IMAGE_COUNT_OPTIONS}
              />
              <div className="col-span-2 flex min-w-0 gap-2 sm:col-span-4 lg:col-span-2">
                <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 focus-within:border-primary transition-colors">
                  <Sparkles className="shrink-0 text-secondary/80" size={14} />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-xs text-on-surface outline-none placeholder:text-on-surface-variant/50"
                    value={promptInstruction}
                    onChange={(event) => setPromptInstruction(event.target.value)}
                    placeholder={t('home_prompt_instruction')}
                  />
                </label>
                <button
                  className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-secondary/30 bg-secondary/5 px-3 text-xs font-medium text-secondary hover:bg-secondary/10 disabled:opacity-40 transition-colors"
                  type="button"
                  disabled={optimizingPrompt || !promptValue.trim()}
                  onClick={handleOptimizePrompt}
                >
                  {optimizingPrompt ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
                  <span className="hidden sm:inline">{optimizingPrompt ? t('home_optimizing_prompt') : t('home_optimize_prompt')}</span>
                  <span className="sm:hidden">AI</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <textarea
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  className="h-16 w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low p-2.5 text-sm text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface-variant/50 md:h-20 md:p-3"
                  placeholder={t('home_placeholder')}
                ></textarea>
                <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-on-surface-variant">
                  <button
                    className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors"
                    type="button"
                    onClick={() => setPromptEditorOpen(true)}
                    title={t('prompt_editor_expand')}
                  >
                    <Maximize2 size={10} />
                    {t('prompt_editor_expand')}
                  </button>
                  <span>[{promptValue.length}/8000]</span>
                </div>
              </div>

              <div className="flex min-w-0 gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative flex h-12 w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant hover:border-primary transition-colors sm:h-16 md:h-20 md:w-16"
                  title={t('home_ref_image')}
                >
                  <ImagePlus className="mb-1 h-5 w-5 text-on-surface-variant transition-colors group-hover:text-primary" />
                  <span className="text-[8px] text-on-surface-variant group-hover:text-primary">{t('home_ref_image')}</span>
                </button>
                <button
                  onClick={handleExecute}
                  disabled={loading || !promptValue.trim()}
                  className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors sm:h-16 sm:w-20 sm:flex-none md:h-20 md:w-28"
                >
                  {loading ? <Loader2 className="animate-spin" size={22} /> : <span className="text-lg font-bold">{t('home_execute')}</span>}
                  <span className="text-[10px] opacity-70">{selectedReferences.length ? t('home_edit') : t('home_generate')}</span>
                </button>
              </div>
            </div>
          </>
        ) : null}

        {selectedPreviews.length > 0 && (
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
            {selectedPreviews.map((preview, index) => (
              <div key={preview.id} className="group/reference relative flex w-48 shrink-0 gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-1.5">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-surface-container">
                  <button
                    type="button"
                    className="h-full w-full cursor-zoom-in"
                    title={preview.name}
                    onClick={() => setPreviewItem({ imageUrl: preview.url, prompt: preview.name })}
                  >
                    <RetryImage alt={preview.name} className="h-full w-full object-cover" src={preview.url} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('modal_close')}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded bg-black/60 text-white/80 hover:bg-error hover:text-white transition-colors opacity-0 group-hover/reference:opacity-100"
                    onClick={() => removeReferenceImage(index)}
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block">
                    <span className="mb-0.5 block text-[9px] text-on-surface-variant">{t('reference_role')}</span>
                    <select
                      className="h-7 w-full rounded-md border border-outline-variant bg-surface px-1 text-[10px] text-on-surface outline-none focus:border-primary"
                      value={selectedReferences[index]?.role || ''}
                      onChange={(event) => updateReferenceImage(index, { role: event.target.value })}
                    >
                      {REFERENCE_ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] text-on-surface-variant">{t('reference_note')}</span>
                    <input
                      className="h-7 w-full rounded-md border border-outline-variant bg-surface px-1 text-[10px] text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:border-primary"
                      value={selectedReferences[index]?.note || ''}
                      onChange={(event) => updateReferenceImage(index, { note: event.target.value })}
                      placeholder={t('reference_note_placeholder')}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <div className="flex h-9 shrink-0 rounded-lg bg-surface-container p-0.5">
            <button
              className={`rounded-md px-3 text-xs font-medium transition-colors ${
                inspirationSearchMode === 'keyword' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
              onClick={setKeywordSearchMode}
            >
              {t('home_case_search_keyword')}
            </button>
            <button
              className={`rounded-md px-3 text-xs font-medium transition-colors ${
                inspirationSearchMode === 'ai' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
              onClick={handleAISearch}
              disabled={aiSearching || !inspirationSearchInput.trim()}
            >
              {aiSearching ? <Loader2 className="mx-auto animate-spin" size={14} /> : t('home_case_search_ai')}
            </button>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 focus-within:border-primary transition-colors">
            <Search className="shrink-0 text-on-surface-variant" size={16} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
              value={inspirationSearchInput}
              onChange={(event) => {
                patchState({ inspirationSearchInput: event.target.value });
                if (inspirationSearchMode === 'ai') {
                  patchState({ inspirationAIQuery: '' });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && inspirationSearchMode === 'ai') {
                  event.preventDefault();
                  handleAISearch().catch(() => undefined);
                }
              }}
              placeholder={t('home_case_search')}
            />
            {inspirationSearchInput ? (
              <button
                className="flex h-7 w-7 shrink-0 items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                type="button"
                title={t('home_case_clear_search')}
                aria-label={t('home_case_clear_search')}
                onClick={() => {
                  patchState({
                    inspirationSearchInput: '',
                    inspirationQuery: '',
                    inspirationAIQuery: '',
                    inspirationSearchMode: 'keyword',
                    initialized: false,
                  });
                }}
              >
                <X size={15} />
              </button>
            ) : null}
          </label>
        </div>
        <div className="shrink-0 text-xs text-on-surface-variant">
          {aiSearching
            ? t('home_case_ai_searching')
            : inspirationSearchMode === 'ai' && inspirationAIQuery
              ? t('home_case_ai_query', { value: inspirationAIQuery })
              : inspirationQuery
                ? t('home_case_search_results', { total: inspirationTotal })
                : t('home_case_total', { total: inspirationTotal })}
        </div>
      </div>

      {/* Feed */}
      {feedLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="animate-skeleton rounded-xl bg-surface-container overflow-hidden">
              <div className="aspect-[3/4] bg-surface-container-high" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-24 rounded bg-surface-container-high" />
                <div className="h-4 w-full rounded bg-surface-container-high" />
                <div className="h-4 w-3/4 rounded bg-surface-container-high" />
              </div>
            </div>
          ))}
          <div className="col-span-full flex items-center justify-center gap-3 py-4 text-sm text-on-surface-variant">
            <Loader2 className="animate-spin" size={16} />
            {t('home_loading_feed')}
          </div>
        </div>
      ) : visibleFeed.length > 0 ? (
        <>
          <MasonryGrid
            items={visibleFeed}
            getKey={(item) => item.key}
            renderItem={(item) => {
              const canFavorite = Boolean(viewer?.authenticated && item.inspirationId);
              const favoritePending = item.inspirationId ? favoritePendingIds.includes(item.inspirationId) : false;
              const images = item.images.length > 0 ? item.images : [{ id: item.id, url: item.img, prompt: item.prompt }];
              const isBatch = images.length > 1;
              return (
                <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
                  {isBatch ? (
                    <div className="grid grid-cols-3 gap-1 p-1">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-md text-left"
                          type="button"
                          onClick={() => setPreviewItem({
                              images: images.map((galleryImage, galleryIndex) => ({
                                id: galleryImage.id,
                                url: galleryImage.url,
                                prompt: galleryImage.prompt,
                                title: `${item.title}-${galleryIndex + 1}`,
                              })),
                              initialIndex: index,
                              prompt: image.prompt,
                            })}
                        >
                          <RetryImage
                            alt={`${item.id}-${index + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            src={image.url}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="block w-full cursor-zoom-in text-left"
                      type="button"
                      onClick={() => setPreviewItem({ imageUrl: item.img, prompt: item.prompt })}
                    >
                      <RetryImage
                        alt={item.id}
                        className="block h-auto w-full"
                        loading="lazy"
                        src={item.img}
                      />
                    </button>
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-xs font-medium text-secondary">{item.title}</div>
                      {isBatch ? <span className="shrink-0 text-xs text-on-surface-variant">x{images.length}</span> : null}
                    </div>
                    <p className="mb-3 line-clamp-3 text-sm text-on-surface">{item.prompt}</p>
                    <div className={`flex gap-2 ${canFavorite ? '' : ''}`}>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        type="button"
                        onClick={() => setPreviewItem({
                            imageUrl: images[0]?.url || item.img,
                            images: isBatch
                              ? images.map((galleryImage, galleryIndex) => ({
                                id: galleryImage.id,
                                url: galleryImage.url,
                                prompt: galleryImage.prompt,
                                title: `${item.title}-${galleryIndex + 1}`,
                              }))
                              : undefined,
                            initialIndex: 0,
                            prompt: item.prompt,
                          })}
                        title={t('history_preview')}
                      >
                        <Maximize2 size={15} />
                      </button>
                      {canFavorite ? (
                        <button
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                            item.favorited
                              ? 'border-secondary/40 bg-secondary/10 text-secondary'
                              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                          }`}
                          type="button"
                          disabled={favoritePending}
                          onClick={() => handleToggleFavorite(item)}
                          title={item.favorited ? t('home_unfavorite_case') : t('home_favorite_case')}
                        >
                          {favoritePending ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : (
                            <Heart className={item.favorited ? 'fill-secondary' : ''} size={15} />
                          )}
                        </button>
                      ) : null}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleClonePrompt(item.prompt).catch(() => undefined);
                        }}
                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-on-primary hover:bg-primary/90 transition-colors"
                      >
                        <RefreshCw size={14} />
                        {t('home_clone_prompt')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <div className="flex flex-col items-center gap-4 py-8">
            {loadingMoreFeed ? (
              <div className="flex items-center justify-center gap-3 text-sm text-on-surface-variant">
                <Loader2 className="animate-spin" size={16} />
                {t('home_loading_more')}
              </div>
            ) : hasMoreInspirations ? (
              <button
                className="rounded-lg border border-outline-variant bg-surface px-6 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
                type="button"
                onClick={() => loadMoreInspirations().catch(() => undefined)}
              >
                {t('home_load_more')}
              </button>
            ) : (
              <div className="text-sm text-on-surface-variant">{t('home_all_loaded')}</div>
            )}
            <div ref={loadMoreRef} className="h-2 w-full" />
          </div>
        </>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 text-sm text-on-surface-variant">
          {t('home_empty_feed')}
        </div>
      )}

      <ImagePreviewModal
        imageUrl={previewItem?.imageUrl || null}
        images={previewItem?.images}
        initialIndex={previewItem?.initialIndex || 0}
        alt={previewItem?.prompt || 'preview'}
        subtitle={previewItem?.prompt}
        onClose={() => setPreviewItem(null)}
      />
      <PromptEditorModal
        open={promptEditorOpen}
        value={promptValue}
        onChange={setPromptValue}
        onClose={() => setPromptEditorOpen(false)}
        onCopy={() => handleCopyPrompt().catch(() => undefined)}
      />
      {showBackToTop ? (
        <button
          className="fixed right-5 bottom-24 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface/80 text-on-surface-variant backdrop-blur hover:bg-surface hover:text-on-surface shadow-lg transition-colors"
          type="button"
          title={t('home_back_to_top')}
          aria-label={t('home_back_to_top')}
          onClick={scrollToTop}
        >
          <ArrowUp size={18} />
        </button>
      ) : null}
    </div>
  );
}
