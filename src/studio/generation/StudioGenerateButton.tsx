import { useState } from 'react';
import { WandSparkles } from 'lucide-react';
import { generateEcommerceImages, getImageTask, type ImageTask } from '../../api';
import type { StudioAsset } from '../state/studioTypes';
import { buildGenerationRequest, type StudioGenerationContext } from './buildGenerationRequest';

function resultUrlFromTask(task: ImageTask) {
  const item = task.items.find((entry) => entry.status === 'succeeded' && (entry.image_url || entry.image_path));
  return item?.image_url || item?.image_path || null;
}

async function waitForTaskResult(taskId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const task = await getImageTask(taskId);
    if (task.status === 'succeeded') return task;
    if (task.status === 'failed') throw new Error(task.error || 'Generation failed');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return getImageTask(taskId);
}

export function StudioGenerateButton({
  getContext,
  onTaskCreated,
  onResult,
}: {
  getContext: () => StudioGenerationContext | null;
  onTaskCreated: (taskId: string) => void;
  onResult: (asset: StudioAsset) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    const context = getContext();
    if (!context) {
      setError('Upload a product image and add a prompt first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const request = buildGenerationRequest(context);
      const task = await generateEcommerceImages(request.payload, request.images);
      onTaskCreated(task.id);
      const completed = task.status === 'succeeded' ? task : await waitForTaskResult(task.id);
      const src = resultUrlFromTask(completed);
      if (!src) throw new Error('Generation finished without an image URL');
      onResult({
        id: `generated-${completed.id}-${Date.now()}`,
        kind: 'generated-image',
        name: `Generated ${new Date().toLocaleTimeString()}`,
        src,
        metadata: {
          taskId: completed.id,
          width: 1024,
          height: 1024,
          mimeType: 'image/png',
          role: 'generated',
        },
      });
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-lime px-3 text-xs font-bold text-on-lime disabled:cursor-wait disabled:opacity-70"
      >
        <WandSparkles size={15} aria-hidden="true" />
        {loading ? 'Generating' : 'Generate'}
      </button>
      {error ? <span className="max-w-56 truncate text-xs text-error">{error}</span> : null}
    </div>
  );
}

