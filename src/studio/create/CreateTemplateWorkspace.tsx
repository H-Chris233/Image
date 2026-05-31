import { ImageIcon, PencilLine, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/design-system/Button';
import { SelectControl, TextInputControl } from '../../components/design-system/FormField';
import type { StudioLocation } from '../app/studioLocation';
import type { StudioDemoT3 } from '../app/studioDemoTree';
import { TemplateCard } from './TemplateCard';
import {
  CREATE_TEMPLATES,
  templateById,
  templatesForScenario,
  type StudioCreateTemplate,
} from './createTemplates';
import { sceneTemplateFromLocation } from './createTemplateResolver';
import { templateToDemoItem } from './templateToDemoItem';

export function CreateTemplateWorkspace({
  scenarioId,
  location,
  onSelectItem,
}: {
  scenarioId: string | null | undefined;
  location: StudioLocation;
  onSelectItem: (item: StudioDemoT3) => void;
  onClearSelection: () => void;
}) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [ratioFilter, setRatioFilter] = useState('all');
  const templates = templatesForScenario(scenarioId);
  const sceneTemplate = sceneTemplateFromLocation(location);
  const selectedTemplate = sceneTemplate ?? templateById(location.t3?.id) ?? templates[0] ?? CREATE_TEMPLATES[0];
  const platforms = unique(templates.flatMap((template) => template.platforms));
  const ratios = unique(templates.flatMap((template) => template.aspectRatios));
  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        !normalizedSearch ||
        [template.title, template.useCase, ...template.platforms, ...template.aspectRatios]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      const matchesPlatform = platformFilter === 'all' || template.platforms.includes(platformFilter);
      const matchesRatio = ratioFilter === 'all' || template.aspectRatios.includes(ratioFilter);
      return matchesSearch && matchesPlatform && matchesRatio;
    });
  }, [platformFilter, ratioFilter, search, templates]);

  function selectTemplate(template: StudioCreateTemplate) {
    onSelectItem(templateToDemoItem(template));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] p-2">
        <div className="px-2 text-sm font-bold text-on-surface">开始</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" iconStart={<ImageIcon size={14} />} onClick={() => selectTemplate(templateById('ecommerce-white-bg') ?? CREATE_TEMPLATES[0])}>
            从白底图开始
          </Button>
          <Button variant="ghost" size="sm" iconStart={<PencilLine size={14} />} onClick={() => selectTemplate(templateById('quick-prompt') ?? CREATE_TEMPLATES[0])}>
            写提示词
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
        <div className="whitespace-nowrap text-sm font-bold text-on-surface">模板画廊</div>
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_130px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
            <TextInputControl
              className="pl-9"
              placeholder="搜索模板"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <SelectControl value={platformFilter} aria-label="平台筛选" onChange={(event) => setPlatformFilter(event.target.value)}>
            <option value="all">全部平台</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </SelectControl>
          <SelectControl value={ratioFilter} aria-label="尺寸筛选" onChange={(event) => setRatioFilter(event.target.value)}>
            <option value="all">全部尺寸</option>
            {ratios.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </SelectControl>
        </div>
      </div>

      <div className="grid flex-1 content-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map((template, index) => (
          <TemplateCard
            key={template.id}
            template={template}
            active={selectedTemplate?.id === template.id}
            index={index}
            onSelect={selectTemplate}
          />
        ))}
        {filteredTemplates.length ? null : (
          <div className="col-span-full flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-surface p-5 text-center text-sm text-on-surface-variant">
            没有匹配模板。
          </div>
        )}
      </div>
    </section>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
