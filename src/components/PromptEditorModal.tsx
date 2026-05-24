import { Copy, Minimize2, X } from 'lucide-react';
import { useSite } from '../site';
import { Button, IconButton, TextareaControl } from './design-system';

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
        className="flex h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-2xl border border-white/[0.08] bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[80vh] animate-fade-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-on-surface">{t('prompt_editor_title')}</div>
            <div className="mt-0.5 text-xs text-on-surface-variant">[{value.length}/8000]</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              iconStart={<Copy size={14} />}
              type="button"
              onClick={onCopy}
              title={t('prompt_editor_copy')}
            >
              <span className="hidden sm:inline">{t('prompt_editor_copy')}</span>
            </Button>
            <IconButton
              label={t('prompt_editor_clear')}
              icon={<X size={15} />}
              onClick={() => onChange('')}
            />
            <IconButton
              label={t('prompt_editor_collapse')}
              icon={<Minimize2 size={14} />}
              onClick={onClose}
            />
            <IconButton
              label={t('modal_close')}
              icon={<X size={16} />}
              onClick={onClose}
            />
          </div>
        </div>

        <TextareaControl
          autoFocus
          unstyled
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
