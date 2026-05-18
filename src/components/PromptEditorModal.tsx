import { Copy, Maximize2, Minimize2, X } from 'lucide-react';
import { useSite } from '../site';

type Props = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onCopy: () => void;
};

export default function PromptEditorModal({ open, value, onChange, onClose, onCopy }: Props) {
  const { t } = useSite();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl border border-outline-variant bg-surface shadow-xl sm:h-[80vh] animate-fade-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-on-surface">{t('prompt_editor_title')}</div>
            <div className="mt-0.5 text-xs text-on-surface-variant">[{value.length}/8000]</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
              type="button"
              onClick={onCopy}
              title={t('prompt_editor_copy')}
            >
              <Copy size={14} />
              <span className="hidden sm:inline">{t('prompt_editor_copy')}</span>
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              type="button"
              onClick={() => onChange('')}
              title={t('prompt_editor_clear')}
            >
              <X size={15} />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              type="button"
              onClick={onClose}
              title={t('prompt_editor_collapse')}
            >
              <Minimize2 size={14} />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              type="button"
              onClick={onClose}
              title={t('modal_close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <textarea
          autoFocus
          className="min-h-0 flex-1 resize-none bg-surface-container-low p-4 text-sm leading-6 text-on-surface outline-none placeholder:text-on-surface-variant/50 rounded-b-2xl"
          maxLength={8000}
          placeholder={t('home_placeholder')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
