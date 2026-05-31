import type { ImageTask } from '../../api';

export function resultUrlsFromTask(task: ImageTask) {
  return task.items
    .filter((item) => item.status === 'succeeded' && (item.image_url || item.image_path))
    .map((item) => item.image_url || item.image_path)
    .filter(Boolean) as string[];
}
