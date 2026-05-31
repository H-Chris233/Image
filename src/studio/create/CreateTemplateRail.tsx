import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { cx } from '../../components/design-system/cx';
import { STUDIO_NAV } from '../app/studioNav';
import { CREATE_TEMPLATES, type StudioCreateTemplate } from './createTemplates';

export function CreateTemplateRail({
  activeTemplateId,
  onSelectTemplate,
  onClose,
}: {
  activeTemplateId: string;
  onSelectTemplate: (template: StudioCreateTemplate) => void;
  onClose: () => void;
}) {
  const createNav = STUDIO_NAV.find((item) => item.id === 'create');

  return (
    <aside className="flex min-h-0 flex-col border-r border-white/[0.08] bg-[#151514] max-lg:border-b max-lg:border-r-0">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-3">
        <Button variant="ghost" size="sm" iconStart={<ArrowLeft size={14} />} onClick={onClose}>
          返回
        </Button>
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
          <Sparkles size={14} className="text-lime" aria-hidden="true" />
          创建编辑器
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 max-lg:max-h-72">
        <div className="space-y-5">
          {(createNav?.children ?? []).map((section) => {
            const templates = CREATE_TEMPLATES.filter((template) => template.scenario === section.id);
            if (!templates.length) return null;
            return (
              <section key={section.id}>
                <div className="mb-2 px-1 text-xs font-bold text-on-surface-variant">{section.label}</div>
                <div className="space-y-1.5">
                  {templates.map((template) => {
                    const active = template.id === activeTemplateId;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        data-active={active}
                        className={cx(
                          'ds-motion-press grid w-full grid-cols-[44px_minmax(0,1fr)_18px] items-center gap-3 rounded-lg border p-2 text-left transition',
                          active
                            ? 'border-lime/55 bg-lime/10 text-on-surface'
                            : 'border-white/[0.06] bg-white/[0.025] text-on-surface-variant hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-on-surface',
                        )}
                        onClick={() => onSelectTemplate(template)}
                      >
                        <img src={template.previewImage} alt="" className="h-11 w-11 rounded-md object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{template.title}</span>
                          <span className="mt-0.5 block truncate text-xs opacity-70">{template.useCase}</span>
                        </span>
                        {active ? <Check size={15} className="text-lime" aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
