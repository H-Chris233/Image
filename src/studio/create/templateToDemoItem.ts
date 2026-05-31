import type { StudioDemoT3 } from '../app/studioDemoTree';
import type { StudioCreateTemplate } from './createTemplates';

export function templateToDemoItem(template: StudioCreateTemplate): StudioDemoT3 {
  return {
    id: template.id,
    title: template.title,
    description: template.useCase,
    kind: 'workflow',
    composer: 'create',
    preset: {
      id: template.id,
      title: template.title,
      scenario: template.scenario,
      useCase: template.useCase,
      aspectRatio: template.aspectRatios[0] ?? '',
      promptTemplate: template.promptTemplate,
    },
    actions: template.quickActions,
  };
}
