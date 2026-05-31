import type { HistoryItem } from '../../api';
import type { UserImage } from './historyTypes';

function historyImageUrl(item: HistoryItem) {
  return item.image_url || item.image_path || '';
}

function historyInputUrl(item: HistoryItem) {
  return item.input_image_url || item.input_image_path || '';
}

export function uniqueHistoryImages(items: HistoryItem[]): UserImage[] {
  const seen = new Set<string>();
  const images: UserImage[] = [];

  for (const item of items) {
    const outputUrl = historyImageUrl(item);
    if (outputUrl && !seen.has(outputUrl)) {
      seen.add(outputUrl);
      images.push({
        id: `history-output-${item.id}`,
        src: outputUrl,
        title: item.task_prompt || item.prompt || 'Generated image',
        subtitle: 'History output',
        prompt: item.prompt || item.task_prompt || '',
        source: 'history-output',
      });
    }

    const inputUrl = historyInputUrl(item);
    if (inputUrl && !seen.has(inputUrl)) {
      seen.add(inputUrl);
      images.push({
        id: `history-input-${item.id}`,
        src: inputUrl,
        title: 'Input image',
        subtitle: 'History input',
        prompt: item.prompt || item.task_prompt || '',
        source: 'history-input',
      });
    }
  }

  return images.slice(0, 24);
}
