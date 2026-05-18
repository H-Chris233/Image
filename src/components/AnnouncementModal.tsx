import { Bell, X } from 'lucide-react';
import { useSite } from '../site';

export default function AnnouncementModal() {
  const { announcementOpen, closeAnnouncement, siteSettings, t } = useSite();

  if (!announcementOpen) {
    return null;
  }

  const announcement = siteSettings?.announcement;
  const hasContent = Boolean(announcement?.title || announcement?.body);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={closeAnnouncement}>
      <div
        className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface p-6 shadow-xl animate-fade-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-secondary">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-xs text-secondary font-medium">{t('top_announcement')}</div>
              <h2 className="mt-0.5 text-lg font-bold text-on-surface">{announcement?.title || t('top_announcement')}</h2>
            </div>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            type="button"
            onClick={closeAnnouncement}
            title={t('modal_close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-surface-container-low p-5 text-sm leading-7 text-on-surface whitespace-pre-wrap">
          {hasContent ? announcement?.body || announcement?.title : t('announcement_empty')}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-lg border border-outline-variant px-5 py-2 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            type="button"
            onClick={closeAnnouncement}
          >
            {t('modal_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
