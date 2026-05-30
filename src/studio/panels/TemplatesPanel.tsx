import type { StudioTemplate } from '../templates/templateCatalog';

export function TemplatesPanel({
  templates,
  onApplyTemplate,
}: {
  templates: StudioTemplate[];
  onApplyTemplate: (template: StudioTemplate) => void;
}) {
  return (
    <section className="mt-5 min-h-0">
      <h2 className="text-sm font-bold">Templates</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] text-left hover:border-lime/70"
            onClick={() => onApplyTemplate(template)}
          >
            {template.sampleImage ? (
              <img src={template.sampleImage} alt={template.title} className="aspect-square w-full object-cover" />
            ) : (
              <span className="block aspect-square w-full bg-white/[0.04]" />
            )}
            <span className="block truncate px-2 py-1.5 text-[11px] text-on-surface-variant">{template.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

