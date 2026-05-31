import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { generateEcommerceImages, generateImage } from '../../api';
import { providerImageSize } from '../../imageOptions';
import { useTasks } from '../../tasks';
import { humanizeTaskError } from '../generation/errorMessages';
import { resultUrlsFromTask } from '../generation/resultAdapters';
import { STUDIO_COUNT_OPTIONS, useStudioPreferences } from '../preferences/useStudioPreferences';
import type { StudioCreateTemplate } from './createTemplates';
import { isFileTemplateInput, missingRequiredTemplateInputs } from './templateQuickEditValidation';

type InputValues = Record<string, string>;
type VariableValues = Record<string, string | boolean>;
type InputFiles = Record<string, File | null>;
export type TemplateSubmitState = 'idle' | 'submitting' | 'polling' | 'succeeded' | 'failed';

export function useTemplateGeneration(template: StudioCreateTemplate | null) {
  const { addTask, notify, tasks } = useTasks();
  const { preferences } = useStudioPreferences();
  const [inputValues, setInputValues] = useState<InputValues>({});
  const [variableValues, setVariableValues] = useState<VariableValues>({});
  const [inputFiles, setInputFiles] = useState<InputFiles>({});
  const [aspectRatio, setAspectRatio] = useState('');
  const [count, setCount] = useState(1);
  const [promptOverride, setPromptOverride] = useState('');
  const [status, setStatus] = useState<TemplateSubmitState>('idle');
  const [error, setError] = useState('');
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [submittedTaskId, setSubmittedTaskId] = useState('');
  const terminalNoticeKeyRef = useRef('');

  useEffect(() => {
    if (!template) return;
    setInputValues(Object.fromEntries(template.requiredInputs.filter((input) => input.type === 'text').map((input) => [input.id, ''])));
    setVariableValues(Object.fromEntries(template.variables.map((variable) => [variable.id, variable.defaultValue])));
    setInputFiles({});
    setAspectRatio(template.aspectRatios[0] ?? preferences.aspectRatio);
    setCount(preferences.count);
    setPromptOverride('');
    setStatus('idle');
    setError('');
    setResultUrls([]);
    setSubmittedTaskId('');
    terminalNoticeKeyRef.current = '';
  }, [preferences.aspectRatio, preferences.count, template?.id]);

  const templatePrompt = useMemo(() => {
    if (!template) return '';
    return buildPrompt(template.promptTemplate, { ...variableValues, ...inputValues });
  }, [inputValues, template, variableValues]);
  const finalPrompt = promptOverride.trim() ? promptOverride : templatePrompt;
  const imageInputs = useMemo(() => template?.requiredInputs.filter(isFileTemplateInput) ?? [], [template]);
  const primaryImage = imageInputs.map((input) => inputFiles[input.id]).find(Boolean) ?? null;
  const missingInputs = template ? missingRequiredTemplateInputs(template, inputValues, inputFiles) : [];
  const validationMessage = !finalPrompt.trim()
    ? '先填写提示词。'
    : missingInputs.length
      ? `需补充：${missingInputs.map((input) => input.label).join('、')}`
      : '';
  const canSubmit = Boolean(template) && !validationMessage && status !== 'submitting' && status !== 'polling';
  const liveTask = useMemo(
    () => (submittedTaskId ? tasks.find((task) => task.id === submittedTaskId) ?? null : null),
    [submittedTaskId, tasks],
  );

  useEffect(() => {
    if (!submittedTaskId || !liveTask || !template) return;

    if (liveTask.status === 'queued' || liveTask.status === 'running') {
      setStatus('polling');
      setError('');
      return;
    }

    const noticeKey = `${liveTask.id}:${liveTask.status}:${liveTask.updated_at}`;
    if (liveTask.status === 'succeeded') {
      const urls = resultUrlsFromTask(liveTask);
      if (urls.length) {
        setResultUrls(urls);
        setError('');
        setStatus('succeeded');
        if (terminalNoticeKeyRef.current !== noticeKey) {
          terminalNoticeKeyRef.current = noticeKey;
          notify({ kind: 'success', title: '生成完成', message: template.title });
        }
        return;
      }

      const message = '任务已完成，但没有可显示的结果图。';
      setResultUrls([]);
      setError(message);
      setStatus('failed');
      if (terminalNoticeKeyRef.current !== noticeKey) {
        terminalNoticeKeyRef.current = noticeKey;
        notify({ kind: 'error', title: '结果不可用', message });
      }
      return;
    }

    const message = humanizeTaskError(liveTask.error);
    setResultUrls([]);
    setError(message);
    setStatus('failed');
    if (terminalNoticeKeyRef.current !== noticeKey) {
      terminalNoticeKeyRef.current = noticeKey;
      notify({ kind: 'error', title: '生成失败', message });
    }
  }, [liveTask, notify, submittedTaskId, template]);

  function handleFileChange(inputId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setInputFiles((current) => ({ ...current, [inputId]: file }));
    event.target.value = '';
  }

  function setInputFile(inputId: string, file: File | null) {
    setInputFiles((current) => ({ ...current, [inputId]: file }));
  }

  async function submitTemplate() {
    if (!template || !canSubmit) {
      setError(validationMessage || '先补充必填信息。');
      return;
    }

    setStatus('submitting');
    setError('');
    setResultUrls([]);
    setSubmittedTaskId('');
    terminalNoticeKeyRef.current = '';
    try {
      const hasImage = Boolean(primaryImage);
      const task = hasImage
        ? await generateEcommerceImages(
            {
              platform: template.platforms[0] ?? '',
              scenarios: template.useCase,
              style: finalPrompt,
              extra_requirements: finalPrompt,
              size: providerImageSize('FAST', aspectRatio),
              aspect_ratio: aspectRatio,
              quality: 'auto',
              n: count,
            },
            imageInputs
              .map((input, index) => {
                const file = inputFiles[input.id];
                return file ? { file, primary: index === 0, role: input.label, note: input.label } : null;
              })
              .filter(Boolean) as { file: File; primary: boolean; role: string; note: string }[],
          )
        : await generateImage({
            prompt: finalPrompt,
            size: providerImageSize('FAST', aspectRatio),
            aspect_ratio: aspectRatio,
            quality: 'auto',
            n: count,
          });
      addTask(task);
      setSubmittedTaskId(task.id);
      setStatus('polling');
    } catch (event) {
      const message = humanizeTaskError(event instanceof Error ? event.message : '');
      setStatus('failed');
      setError(message);
      setSubmittedTaskId('');
      notify({ kind: 'error', title: '生成失败', message });
    }
  }

  return {
    inputValues,
    setInputValues,
    variableValues,
    setVariableValues,
    inputFiles,
    setInputFile,
    aspectRatio,
    setAspectRatio,
    count,
    setCount,
    promptOverride,
    setPromptOverride,
    status,
    error,
    setError,
    resultUrls,
    templatePrompt,
    finalPrompt,
    imageInputs,
    primaryImage,
    missingInputs,
    validationMessage,
    canSubmit,
    handleFileChange,
    submitTemplate,
    countOptions: STUDIO_COUNT_OPTIONS,
  };
}

export function buildPrompt(template: string, values: Record<string, string | boolean | undefined>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = values[key];
    if (typeof value === 'boolean') return value ? '是' : '否';
    return value?.trim() || '';
  });
}
