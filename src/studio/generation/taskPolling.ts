import { getImageTask } from '../../api';

export async function waitForTaskResult(taskId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const task = await getImageTask(taskId);
    if (task.status === 'succeeded') return task;
    if (task.status === 'failed') throw new Error(task.error || 'Image-2 generation failed');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return getImageTask(taskId);
}
