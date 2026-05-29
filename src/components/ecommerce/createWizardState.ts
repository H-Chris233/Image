import type { SceneTemplate } from './sceneCatalog';

export type WizardStep = 'browse' | 'upload' | 'tune';

export interface WizardState {
  step: WizardStep;
  selectedTemplate: SceneTemplate | null;
  productImage: File | null;
  brief: string;
  aspectRatio: string;
  imageCount: number;
  generating: boolean;
  error: string | null;
}

export type WizardAction =
  | { type: 'select_template'; template: SceneTemplate }
  | { type: 'set_product_image'; file: File | null }
  | { type: 'set_brief'; brief: string }
  | { type: 'back' }
  | { type: 'next_from_upload' }
  | { type: 'set_aspect_ratio'; aspectRatio: string }
  | { type: 'set_image_count'; imageCount: number }
  | { type: 'generate_start' }
  | { type: 'generate_finish' }
  | { type: 'set_error'; error: string | null };

export function createInitialWizardState(initialBrief = ''): WizardState {
  return {
    step: 'browse',
    selectedTemplate: null,
    productImage: null,
    brief: initialBrief.slice(0, 300),
    aspectRatio: '1:1',
    imageCount: 1,
    generating: false,
    error: null,
  };
}

export function canContinueFromUpload(state: WizardState): boolean {
  return Boolean(state.productImage) && !state.generating;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'select_template':
      // 选中模板即进入上传步；返回键可回浏览重选。
      return {
        ...state,
        step: 'upload',
        selectedTemplate: action.template,
        error: null,
      };
    case 'set_product_image':
      return { ...state, productImage: action.file, error: null };
    case 'set_brief':
      return { ...state, brief: action.brief.slice(0, 300), error: null };
    case 'next_from_upload':
      if (!state.productImage) return state;
      return { ...state, step: 'tune', error: null };
    case 'back':
      if (state.step === 'tune') return { ...state, step: 'upload', generating: false, error: null };
      if (state.step === 'upload') return { ...state, step: 'browse', error: null };
      return state;
    case 'set_aspect_ratio':
      return { ...state, aspectRatio: action.aspectRatio };
    case 'set_image_count':
      return { ...state, imageCount: Math.max(1, Math.min(4, action.imageCount)) };
    case 'generate_start':
      return { ...state, generating: true, error: null };
    case 'generate_finish':
      return { ...state, generating: false };
    case 'set_error':
      return { ...state, error: action.error };
    default:
      return state;
  }
}
