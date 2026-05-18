import { useEffect, useState } from 'react';
import { Search, Filter, Download, Trash2, RefreshCw, ArrowDown, Loader2, Maximize2, Globe2, Archive } from 'lucide-react';
import { deleteHistory, formatDate, generateImage, getHistory, HistoryItem, publishHistory, taskDownloadUrl, unpublishHistory } from '../api';
import { useAuth } from '../auth';
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

export default function History() {
  const { viewer } = useAuth();
  const { t } = useSite();
  const { addTask, openDrawer, taskHistoryItems } = useTasks();
  const { notifyError } = useNotifier();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);
  const [publishingIds, setPublishingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(nextOffset = 0, append = false) {
    setLoading(true);
    try {
      const data = await getHistory({ limit: 24, offset: nextOffset, q: query });
      if (!append) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      setItems((current) => (append ? [...current, ...data.items] : data.items));
      if (!append) {
        setRemovedIds([]);
      }
      setOffset(nextOffset + data.items.length);
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0, false);
  }, [viewer?.owner_id]);

  async function handleDelete(group: HistoryGroup) {
    const ids = group.items.map((item) => item.id);
    await Promise.all(ids.map((id) => deleteHistory(id)));
    setItems((current) => current.filter((item) => !ids.includes(item.id)));
    setRemovedIds((current) => [...new Set([...current, ...ids])]);
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

  function replaceHistoryItem(nextItem: HistoryItem) {
    setItems((current) => {
      const exists = current.some((item) => item.id === nextItem.id);
      if (!exists) {
        return [nextItem, ...current];
      }
      return current.map((item) => (item.id === nextItem.id ? nextItem : item));
    });
  }

  async function handleTogglePublish(group: HistoryGroup) {
    const publishableItems = group.items.filter((item) => item.status === 'succeeded' && Boolean(item.image_url));
    const targets = group.allPublished ? publishableItems : publishableItems.filter((item) => !item.published);
    if (targets.length === 0) {
      return;
    }
    setPublishingIds((current) => (current.includes(group.key) ? current : [...current, group.key]));
    try {
      const results = await Promise.all(
        targets.map((item) => (group.allPublished ? unpublishHistory(item.id) : publishHistory(item.id))),
      );
      for (const result of results) {
        replaceHistoryItem(result.item);
      }
    } catch (err) {
      notifyError(err);
    } finally {
      setPublishingIds((current) => current.filter((id) => id !== group.key));
    }
  }

  const visibleGroups = groupHistoryItems(
    mergeHistoryItems([...taskHistoryItems, ...items]).filter((item) => !removedIds.includes(item.id)),
  );

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 border-b border-white/10 pb-6">
        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-2 text-[10px] text-primary uppercase font-bold tracking-widest">
              <span className="w-4 h-[1px] bg-primary"></span> {t('history_tag')}
           </div>
          <h1 className="text-4xl md:text-5xl text-on-surface font-bold tracking-tighter">{t('history_title')}</h1>
          <p className="text-white/50 text-sm">{t('history_subtitle')}</p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') load(0, false);
              }}
              className="w-full rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary text-on-surface pl-10 py-2 transition-colors placeholder:text-on-surface-variant/50 outline-none text-sm"
              placeholder={t('history_search')}
              type="text"
            />
          </div>
          <button onClick={() => load(0, false)} className="bg-black border border-primary/20 p-2 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center">
            <Filter size={16} className="text-primary" />
          </button>
        </div>
      </div>

      <MasonryGrid
        items={visibleGroups}
        getKey={(group) => group.key}
        renderItem={(group, index) => {
          const item = group.first;
          const colors = getColorClasses(index % 2 === 0 ? 'primary' : 'secondary');
          const isBatch = group.images.length > 1;
          const previewImage = group.images[0]?.url || item.image_url;
          const publishDisabled = publishingIds.includes(group.key) || group.images.length === 0;
          return (
          <div
            className={`overflow-hidden bg-black border border-white/10 ${colors.borderHover} transition-all duration-300`}
          >
            {isBatch ? (
              <div className="grid grid-cols-3 gap-1 bg-black p-1">
                {group.images.map((image, imageIndex) => (
                  <button
                    key={image.id}
                    className="relative aspect-square cursor-zoom-in overflow-hidden bg-black text-left"
                    type="button"
                    onClick={() => setPreviewItem({
                      images: group.images.map((galleryImage, galleryIndex) => ({
                        id: galleryImage.id,
                        url: galleryImage.url,
                        prompt: galleryImage.prompt,
                        title: `${group.title}-${galleryIndex + 1}`,
                      })),
                      initialIndex: imageIndex,
                      prompt: image.prompt,
                    })}
                  >
                    <RetryImage
                      alt={`${item.id}-${imageIndex + 1}`}
                      className="h-full w-full object-cover opacity-95 transition-opacity duration-300 hover:opacity-100"
                      loading="lazy"
                      src={image.url}
                    />
                  </button>
                ))}
              </div>
            ) : previewImage ? (
              <button
                className="block w-full cursor-zoom-in bg-black text-left"
                type="button"
                onClick={() => setPreviewItem({ imageUrl: previewImage, prompt: item.prompt })}
              >
                <RetryImage
                  alt={item.prompt}
                  className="block h-auto w-full opacity-95 transition-opacity duration-300 hover:opacity-100"
                  src={previewImage}
                />
              </button>
            ) : (
              <div className="flex min-h-64 w-full items-center justify-center px-6 text-center text-xs uppercase text-error/60">
                {item.error || t('history_failed')}
              </div>
            )}

            <div className="border-t border-white/10 bg-surface-container-low/80 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-white/40">
                <span className={colors.textId}>ID:{item.id.slice(0, 4).toUpperCase()}</span>
                <span>{formatDate(item.created_at)}</span>
                <span>{item.size}</span>
                {item.aspect_ratio ? <span>{item.aspect_ratio}</span> : null}
                {isBatch ? <span>x{group.images.length}</span> : null}
                {group.allPublished ? (
                  <span className="text-tertiary">{t('history_published')}</span>
                ) : group.publishedCount > 0 ? (
                  <span className="text-tertiary">{t('history_published')} {group.publishedCount}/{group.images.length}</span>
                ) : null}
              </div>
              <p className={`mb-3 line-clamp-3 text-sm ${colors.textId} transition-colors`}>
                {group.taskPrompt}
              </p>
              <button
                className={`mb-2 flex h-10 w-full items-center justify-center gap-2 border px-3 text-xs font-black uppercase transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.published
                    ? 'border-tertiary/40 bg-tertiary/10 text-tertiary hover:bg-tertiary/20'
                    : 'border-primary/30 bg-primary/10 text-primary hover:border-primary hover:bg-primary/20'
                }`}
                type="button"
                onClick={() => handleTogglePublish(group)}
                disabled={publishDisabled}
              >
                {publishingIds.includes(group.key) ? <Loader2 className="animate-spin" size={14} /> : <Globe2 size={14} />}
                {group.allPublished ? t('history_unpublish_case') : t('history_publish_case')}
              </button>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[44px_44px_44px_44px_1fr]">
                <button
                  className="flex h-10 items-center justify-center border border-white/20 bg-white/5 text-white transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                  type="button"
                  title={t('history_preview')}
                  onClick={() => setPreviewItem({
                    imageUrl: previewImage || null,
                    images: group.images.length > 0
                      ? group.images.map((galleryImage, galleryIndex) => ({
                        id: galleryImage.id,
                        url: galleryImage.url,
                        prompt: galleryImage.prompt,
                        title: `${group.title}-${galleryIndex + 1}`,
                      }))
                      : undefined,
                    initialIndex: 0,
                    prompt: group.taskPrompt,
                  })}
                  disabled={!previewImage}
                >
                  <Maximize2 size={14} />
                </button>
                <a
                  href={previewImage || '#'}
                  download
                  className={`flex h-10 items-center justify-center border border-white/20 bg-white/5 text-white transition-all hover:border-primary hover:text-primary ${previewImage ? '' : 'pointer-events-none opacity-35'}`}
                  title={t('history_download')}
                >
                  <Download size={14} />
                </a>
                <a
                  href={isBatch && item.task_id ? taskDownloadUrl(item.task_id) : '#'}
                  className={`flex h-10 items-center justify-center border border-white/20 bg-white/5 text-white transition-all hover:border-primary hover:text-primary ${
                    isBatch && item.task_id ? '' : 'pointer-events-none opacity-35'
                  }`}
                  title={t('history_download_zip')}
                >
                  <Archive size={14} />
                </a>
                <button
                  onClick={() => handleDelete(group)}
                  className="flex h-10 items-center justify-center border border-error/20 bg-error/5 text-error transition-all hover:bg-error/20"
                  title={t('history_delete')}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => handleRegenerate(group)}
                  className={`col-span-4 flex h-10 min-w-0 items-center justify-center gap-2 px-3 text-xs font-black uppercase sm:col-span-1 ${colors.btnBg} ${colors.btnText} ${colors.btnShadow} shadow-white/40 transition-all duration-300 hover:border-white/80 hover:brightness-110`}
                  type="button"
                >
                  <RefreshCw size={14} />
                  {t('history_regenerate')}
                </button>
              </div>
            </div>
          </div>
          );
        }}
      />

      <div className="mt-12 flex justify-center">
        <button
          onClick={() => load(offset, true)}
          disabled={loading}
          className="rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant px-8 py-3 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <ArrowDown size={14} />}
          {t('history_load_more')}
        </button>
      </div>

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
