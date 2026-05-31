import type { StudioCreateTemplate, TemplateInputType } from './createTemplates';

export type TemplateInputValues = Record<string, string>;
export type TemplateInputFiles = Record<string, File | null | undefined>;

export function isFileTemplateInput(input: { type: TemplateInputType }) {
  return input.type === 'image' || input.type === 'optional-image' || input.type === 'asset';
}

export function missingRequiredTemplateInputs(
  template: StudioCreateTemplate,
  inputValues: TemplateInputValues,
  inputFiles: TemplateInputFiles,
) {
  return template.requiredInputs.filter((input) => {
    if (!input.required) return false;
    if (isFileTemplateInput(input)) return !inputFiles[input.id];
    return !inputValues[input.id]?.trim();
  });
}
