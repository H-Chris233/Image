import type { EcommerceAnalyzeResponse, RecommendedTemplate } from '../../api';

export type WizardStep = 'upload_brief' | 'recommend' | 'tune';

export interface WizardState {
  step: WizardStep;
  productImage: File | null;
  brief: string;
  analyzeResponse: EcommerceAnalyzeResponse | null;
  selectedTemplateId: string | null;
  aspectRatio: string;
  imageCount: number;
  analyzing: boolean;
  generating: boolean;
  error: string | null;
}

export type WizardAction =
  | { type: 'set_product_image'; file: File | null }
  | { type: 'set_brief'; brief: string }
  | { type: 'analyze_start' }
  | { type: 'analyze_success'; response: EcommerceAnalyzeResponse }
  | { type: 'analyze_failure'; error: string }
  | { type: 'select_template'; templateId: string }
  | { type: 'next_from_recommend' }
  | { type: 'back' }
  | { type: 'set_aspect_ratio'; aspectRatio: string }
  | { type: 'set_image_count'; imageCount: number }
  | { type: 'generate_start' }
  | { type: 'generate_finish' }
  | { type: 'set_error'; error: string | null };

export function createInitialWizardState(initialBrief = ''): WizardState {
  return {
    step: 'upload_brief',
    productImage: null,
    brief: initialBrief.slice(0, 300),
    analyzeResponse: null,
    selectedTemplateId: null,
    aspectRatio: '1:1',
    imageCount: 1,
    analyzing: false,
    generating: false,
    error: null,
  };
}

export function selectedTemplate(state: WizardState): RecommendedTemplate | null {
  if (!state.selectedTemplateId) return null;
  return state.analyzeResponse?.recommended_templates.find((template) => template.id === state.selectedTemplateId) ?? null;
}

export function canAnalyze(state: WizardState): boolean {
  return Boolean(state.productImage) && !state.analyzing;
}

export function canContinueFromRecommend(state: WizardState): boolean {
  return Boolean(selectedTemplate(state));
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'set_product_image':
      return {
        ...state,
        productImage: action.file,
        analyzeResponse: null,
        selectedTemplateId: null,
        step: state.step === 'upload_brief' ? state.step : 'upload_brief',
        error: null,
      };
    case 'set_brief':
      return {
        ...state,
        brief: action.brief.slice(0, 300),
        analyzeResponse: null,
        selectedTemplateId: null,
        error: null,
      };
    case 'analyze_start':
      return { ...state, analyzing: true, error: null };
    case 'analyze_success':
      return {
        ...state,
        step: 'recommend',
        analyzing: false,
        analyzeResponse: action.response,
        selectedTemplateId: null,
        error: null,
      };
    case 'analyze_failure':
      return { ...state, analyzing: false, error: action.error };
    case 'select_template':
      return { ...state, selectedTemplateId: action.templateId, error: null };
    case 'next_from_recommend': {
      const template = selectedTemplate(state);
      if (!template) return state;
      return {
        ...state,
        step: 'tune',
        aspectRatio: template.default_aspect_ratio || '1:1',
        imageCount: Math.max(1, Math.min(4, state.imageCount || 1)),
        error: null,
      };
    }
    case 'back':
      if (state.step === 'tune') return { ...state, step: 'recommend', generating: false, error: null };
      if (state.step === 'recommend') return { ...state, step: 'upload_brief', analyzing: false, error: null };
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
