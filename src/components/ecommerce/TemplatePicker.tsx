import { useState } from 'react';

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
  recommendedIds?: string[];
  /** Enable checkbox-style multi-select. Requires selectedIds + onMultiChange. */
  multiSelect?: boolean;
  selectedIds?: string[];
  onMultiChange?: (ids: string[]) => void;
}

const DEFAULT_VISIBLE = 6;

export function TemplatePicker({
  templates,
  value,
  onChange,
  recommendedIds,
  multiSelect = false,
  selectedIds,
  onMultiChange,
}: TemplatePickerProps) {
  const [expanded, setExpanded] = useState(false);

  // Always show selected / recommended items even when collapsed
  const visibleTemplates = expanded
    ? templates
    : templates.filter((tpl, idx) => {
        if (idx < DEFAULT_VISIBLE) return true;
        if (value === tpl.id) return true;
        if (multiSelect && (selectedIds ?? []).includes(tpl.id)) return true;
        if (recommendedIds?.includes(tpl.id)) return true;
        return false;
      });

  const hiddenCount = templates.length - visibleTemplates.length;

  return (
    <div className="space-y-1.5">
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0">
      {visibleTemplates.map((tpl) => {
        const isSelected = multiSelect
          ? (selectedIds ?? []).includes(tpl.id)
          : value === tpl.id;
        const isRecommended = recommendedIds != null && recommendedIds.includes(tpl.id);
        const selectionIndex = multiSelect ? (selectedIds ?? []).indexOf(tpl.id) : -1;

        function handleClick() {
          if (multiSelect && onMultiChange) {
            const current = selectedIds ?? [];
            const next = current.includes(tpl.id)
              ? current.filter((id) => id !== tpl.id)
              : [...current, tpl.id];
            onMultiChange(next);
          } else {
            onChange(tpl.id);
          }
        }

        return (
          <button
            key={tpl.id}
            type="button"
            onClick={handleClick}
            className="group relative overflow-hidden rounded-xl transition-all duration-150"
            style={{
              aspectRatio: '1',
              border: isSelected
                ? '2px solid var(--ag-lime)'
                : isRecommended
                ? '2px solid rgba(227,255,116,0.4)'
                : '2px solid rgba(255,255,255,0.08)',
              boxShadow: isSelected
                ? '0 0 0 3px rgba(227,255,116,0.2)'
                : isRecommended
                ? '0 0 0 2px rgba(227,255,116,0.1)'
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

            {/* Selected indicator — number badge in multi-select, ✓ in single */}
            {isSelected && (
              <div
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: 'var(--ag-lime)', color: 'var(--ag-charcoal)' }}
              >
                {multiSelect ? selectionIndex + 1 : '✓'}
              </div>
            )}

            {/* AI recommendation badge */}
            {!isSelected && isRecommended && (
              <div
                className="absolute left-1 top-1 flex h-3.5 items-center rounded-full px-1 text-[7px] font-black uppercase tracking-wide"
                style={{ background: 'rgba(227,255,116,0.92)', color: 'var(--ag-charcoal)' }}
              >
                AI
              </div>
            )}
          </button>
        );
      })}
    </div>
    {templates.length > DEFAULT_VISIBLE && (
      <button
        type="button"
        className="w-full py-1 text-[9px] font-bold uppercase tracking-widest transition-colors"
        style={{ color: 'rgba(240,237,232,0.35)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ag-lime)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,237,232,0.35)'; }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? '收起 ↑' : `展开全部风格 (${hiddenCount} 更多) ↓`}
      </button>
    )}
    </div>
  );
}
