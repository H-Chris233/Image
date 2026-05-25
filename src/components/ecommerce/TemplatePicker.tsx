interface TemplateItem {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  previewGradient: string;
  exampleImageUrl?: string;
}

interface TemplatePickerProps {
  templates: TemplateItem[];
  value: string | null;
  onChange: (id: string) => void;
}

export function TemplatePicker({ templates, value, onChange }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {templates.map((tpl) => {
        const isSelected = value === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            className="group relative overflow-hidden rounded-xl transition-all duration-150"
            style={{
              aspectRatio: '1',
              border: isSelected
                ? '2px solid var(--ag-lime)'
                : '2px solid rgba(255,255,255,0.08)',
              boxShadow: isSelected
                ? '0 0 0 3px rgba(227,255,116,0.2)'
                : undefined,
              background: tpl.exampleImageUrl ? undefined : tpl.previewGradient,
            }}
          >
            {/* Real example image when available */}
            {tpl.exampleImageUrl && (
              <img
                src={tpl.exampleImageUrl}
                alt={tpl.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const btn = e.currentTarget.parentElement as HTMLElement | null;
                  if (btn) btn.style.background = tpl.previewGradient;
                }}
              />
            )}
            {/* Hover / selected overlay with template info */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity duration-150"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 100%)',
                opacity: isSelected ? 1 : 0,
              }}
            >
              <span className="text-xl leading-none">{tpl.emoji}</span>
              <span className="text-[10px] font-bold leading-none text-white">{tpl.name}</span>
            </div>

            {/* Always-visible overlay on hover */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 100%)',
                display: isSelected ? 'none' : undefined,
              }}
            >
              <span className="text-xl leading-none">{tpl.emoji}</span>
              <span className="text-[10px] font-bold leading-none text-white">{tpl.name}</span>
            </div>

            {/* Selected check indicator */}
            {isSelected && (
              <div
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: 'var(--ag-lime)', color: 'var(--ag-charcoal)' }}
              >
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
