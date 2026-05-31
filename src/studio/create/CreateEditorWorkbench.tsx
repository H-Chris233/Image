import { useState } from 'react';
import type { StudioLocation } from '../app/studioLocation';
import { fileFromImageUrl } from '../shared/fileFromImageUrl';
import type { StudioCreateTemplate } from './createTemplates';
import { templateToDemoItem } from './templateToDemoItem';
import { useTemplateGeneration } from './useTemplateGeneration';
import { CreateTemplateRail } from './CreateTemplateRail';
import { CreateEditorCenter } from './CreateEditorCenter';
import { CreateHistoryRail, type CreateHistorySelection } from './CreateHistoryRail';

export function CreateEditorWorkbench({
  location,
  template,
  onLocationChange,
  onClose,
}: {
  location: StudioLocation;
  template: StudioCreateTemplate;
  onLocationChange: (next: StudioLocation) => void;
  onClose: () => void;
}) {
  const generation = useTemplateGeneration(template);
  const [importingId, setImportingId] = useState('');
  const primaryInput = template.requiredInputs.find((input) => input.type === 'image' || input.type === 'asset' || input.type === 'optional-image');

  function selectTemplate(nextTemplate: StudioCreateTemplate) {
    const item = templateToDemoItem(nextTemplate);
    onLocationChange({
      ...location,
      t2: nextTemplate.scenario,
      t3: { kind: item.kind, id: item.id },
      composer: {
        kind: 'create',
        preset: {
          ...item.preset,
          t1: 'create',
          t2: nextTemplate.scenario,
        },
      },
    });
  }

  async function useImage(image: CreateHistorySelection) {
    if (!primaryInput) return;
    setImportingId(image.id);
    generation.setError('');
    try {
      const file = await fileFromImageUrl(image.src, image.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'history-image');
      generation.setInputFile(primaryInput.id, file);
      if (image.prompt) generation.setPromptOverride(image.prompt.slice(0, 1200));
    } catch (event) {
      generation.setError(event instanceof Error ? event.message : '无法使用这张历史图片');
    } finally {
      setImportingId('');
    }
  }

  return (
    <div className="h-[calc(100vh_-_var(--studio-topnav-h))] overflow-hidden bg-[#0d0d0b] text-on-surface">
      <div className="grid h-full min-h-0 grid-cols-[300px_minmax(0,1fr)_300px] max-xl:grid-cols-[300px_minmax(0,1fr)] max-lg:block max-lg:overflow-y-auto">
        <CreateTemplateRail activeTemplateId={template.id} onSelectTemplate={selectTemplate} onClose={onClose} />
        <CreateEditorCenter template={template} generation={generation} />
        <CreateHistoryRail resultUrls={generation.resultUrls} importingId={importingId} onUseImage={(image) => void useImage(image)} />
      </div>
    </div>
  );
}
