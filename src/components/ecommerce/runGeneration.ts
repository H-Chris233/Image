import { generateEcommerceImages, getBalance, optimizePrompt, type ImageTask } from '../../api';
import { providerImageSize } from '../../imageOptions';
import { templateAspectRatio, templatePrompt, type TemplateCandidate } from './TemplateCard';

export async function runGenerationFromTemplate({
  brief,
  productImageFile,
  selectedTemplate,
}: {
  brief?: string;
  productImageFile: File;
  selectedTemplate: TemplateCandidate;
}): Promise<ImageTask> {
  const balance = await getBalance();
  if (!balance.ok) {
    throw new Error(balance.message || '余额暂时无法同步，请稍后重试');
  }
  if (typeof balance.remaining === 'number' && Number.isFinite(balance.remaining) && balance.remaining <= 0) {
    throw new Error('余额不足，请先充值');
  }

  const aspectRatio = templateAspectRatio(selectedTemplate);
  const size = providerImageSize('FAST', aspectRatio);
  // prompt 优化是软增强：上游 chat 偶发 503/超时不应阻断换模板生图，失败时回退模板原 prompt。
  const templateBasePrompt = templatePrompt(selectedTemplate);
  let optimizedPrompt = brief ? `${templateBasePrompt}\n\n补充需求：${brief}` : templateBasePrompt;
  try {
    const optimized = await optimizePrompt({
      prompt: brief || '',
      instruction: `请按以下模板风格改写：${templatePrompt(selectedTemplate)}`,
      size,
      aspect_ratio: aspectRatio,
      quality: 'auto',
    });
    optimizedPrompt = optimized.optimized_prompt || optimized.prompt || optimizedPrompt;
  } catch {
    // 上游 prompt 优化不可用，降级用模板原 prompt 生图
  }

  return generateEcommerceImages(
    {
      style: optimizedPrompt,
      size,
      aspect_ratio: aspectRatio,
      quality: 'auto',
      n: 1,
    },
    [{ file: productImageFile, primary: true }],
  );
}
