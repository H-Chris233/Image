import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cx } from '../../components/design-system/cx';
import type { StudioCreateTemplate } from './createTemplates';

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
    <button
      type="button"
      aria-pressed={active}
      aria-label={template.title}
      onClick={() => onSelect(template)}
      className={cx(
        'ds-motion-card group relative block aspect-[4/5] w-full overflow-hidden rounded-lg border bg-surface text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime/45',
        active ? 'border-lime' : 'border-white/[0.08] hover:border-white/20',
      )}
      style={{ '--workbench-card-index': index } as CSSProperties}
    >
      <img
        src={template.previewImage}
        alt=""
        width={400}
        height={500}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--ag-ease-out)] group-hover:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      <span
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 transition-transform duration-[350ms] ease-[var(--ag-ease-out)] group-hover:-translate-x-[105%] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      >
        <span className="block truncate font-display text-xl font-bold text-white">{template.title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-white/70">{template.useCase}</span>
      </span>

      {active ? (
        <span className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-lime text-on-lime">
          <Check size={14} aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}
