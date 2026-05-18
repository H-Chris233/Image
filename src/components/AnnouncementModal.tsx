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
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1917] p-6 shadow-xl animate-fade-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[#E3FF74] opacity-50" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(227,255,116,0.1)] text-[#E3FF74]">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-xs font-medium text-[#E3FF74]">{t('top_announcement')}</div>
              <h2 className="mt-0.5 text-lg font-bold text-[#f0ede8]">{announcement?.title || t('top_announcement')}</h2>
            </div>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#8a8680] transition-colors hover:bg-white/[0.05] hover:text-[#f0ede8]"
            type="button"
            onClick={closeAnnouncement}
            title={t('modal_close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-white/[0.03] p-5 text-sm leading-7 text-[#f0ede8] whitespace-pre-wrap">
          {hasContent ? announcement?.body || announcement?.title : t('announcement_empty')}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-lg border border-white/[0.08] px-5 py-2 text-sm font-medium text-[#8a8680] transition-colors hover:bg-white/[0.05] hover:text-[#f0ede8]"
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
