import { Check, ImagePlus, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Button } from '../../components/design-system/Button';
import { cx } from '../../components/design-system/cx';
import type { StudioCreateTemplate, TemplateInputType } from './createTemplates';
import { isFileTemplateInput } from './templateQuickEditValidation';

function inputRequirementLabel(input: { required: boolean; type: TemplateInputType }) {
  if (isFileTemplateInput(input)) return input.required ? '需要' : '可选';
  return input.required ? '需要' : '可选';
}

export function TemplateCard({
  template,
  active,
  index,
  onSelect,
}: {
  template: StudioCreateTemplate;
  active: boolean;
  index: number;
  onSelect: (template: StudioCreateTemplate) => void;
}) {
  return (
    <article
      className={cx(
        'ds-motion-card relative overflow-hidden rounded-lg border bg-surface transition',
        active ? 'border-lime/55' : 'border-white/[0.08] hover:border-white/[0.18]',
      )}
      style={{ '--workbench-card-index': index } as CSSProperties}
    >
      {active ? <span aria-hidden="true" className="absolute left-0 top-0 z-10 h-full w-0.5 bg-lime" /> : null}
      <button type="button" className="block w-full text-left" onClick={() => onSelect(template)}>
        <span className="relative block aspect-[1.52] overflow-hidden bg-white/[0.035]">
          <img src={template.previewImage} alt="" className="h-full w-full object-cover opacity-82 transition duration-300 hover:scale-[1.025]" />
          <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/76 to-transparent" />
          {active ? (
            <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-lime text-on-lime">
              <Check size={14} aria-hidden="true" />
            </span>
          ) : null}
        </span>

        <span className="block p-3">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-bold text-on-surface">{template.title}</span>
              <span className="mt-1 block truncate text-xs font-semibold text-on-surface-variant">{template.useCase}</span>
            </span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.04] text-on-surface-variant">
              <ImagePlus size={16} aria-hidden="true" />
            </span>
          </span>

          <span className="mt-3 flex flex-wrap gap-1.5">
            {template.requiredInputs.slice(0, 2).map((input) => (
              <span key={input.id} className="rounded-full border border-white/[0.08] bg-black/20 px-2 py-1 text-[11px] font-semibold text-on-surface">
                {inputRequirementLabel(input)}：{input.label}
              </span>
            ))}
          </span>

          <span className="mt-2 flex flex-wrap gap-1.5">
            {template.platforms.slice(0, 3).map((platform) => (
              <span key={platform} className="rounded-full bg-white/[0.045] px-2 py-1 text-[11px] text-on-surface-variant">
                {platform}
              </span>
            ))}
            <span className="rounded-full bg-white/[0.045] px-2 py-1 text-[11px] text-on-surface-variant">
              {template.aspectRatios.slice(0, 2).join(' / ')}
            </span>
          </span>
        </span>
      </button>

      <div className="border-t border-white/[0.08] p-2">
        <Button variant="ghost" size="sm" iconStart={active ? <Check size={13} /> : <Sparkles size={13} />} onClick={() => onSelect(template)} fullWidth>
          {active ? '已选择' : '选择模板'}
        </Button>
      </div>
    </article>
  );
}
