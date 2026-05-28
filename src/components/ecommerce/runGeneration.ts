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
  const optimized = await optimizePrompt({
    prompt: brief || '',
    instruction: `请按以下模板风格改写：${templatePrompt(selectedTemplate)}`,
    size,
    aspect_ratio: aspectRatio,
    quality: 'auto',
  });
  const optimizedPrompt = optimized.optimized_prompt || optimized.prompt;

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
