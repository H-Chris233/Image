import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthProvider } from '../../auth';
import { isSupportedImagePreset } from '../../imageOptions';
import { TaskCenterProvider } from '../../tasks';
import type { StudioLocation } from '../app/studioLocation';
import { CreateEditorWorkbench } from './CreateEditorWorkbench';
import { CreateTemplateWorkspace } from './CreateTemplateWorkspace';
import { CREATE_TEMPLATES, templateById } from './createTemplates';
import { missingRequiredTemplateInputs } from './templateQuickEditValidation';
import { templateToDemoItem } from './templateToDemoItem';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const baseLocation: StudioLocation = {
  surface: 'studio',
  t1: 'create',
  t2: 'ecommerce',
  t3: null,
  composer: null,
};

function renderWorkspace(location: StudioLocation) {
  return renderToStaticMarkup(
    <AuthProvider>
      <TaskCenterProvider>
        <CreateTemplateWorkspace
          scenarioId="ecommerce"
          location={location}
          onSelectItem={() => undefined}
          onClearSelection={() => undefined}
        />
      </TaskCenterProvider>
    </AuthProvider>,
  );
}

test('initial state renders the full template gallery without the composer action', () => {
  const html = renderWorkspace(baseLocation);

  assert.match(html, /模板画廊/);
  assert.match(html, /白底图/);
  assert.doesNotMatch(html, />生成</);
  assert.doesNotMatch(html, /换模板/);
  assert.match(html, /aria-pressed="true"/);
});

test('selected template keeps the gallery-only workspace when rendered directly', () => {
  const html = renderWorkspace({
    ...baseLocation,
    t3: { kind: 'workflow', id: 'ecommerce-white-bg' },
    composer: {
      kind: 'create',
      preset: {
        id: 'ecommerce-white-bg',
        t1: 'create',
        t2: 'ecommerce',
      },
    },
  });

  assert.match(html, /模板画廊/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /换模板/);
  assert.doesNotMatch(html, /画布/);
  assert.doesNotMatch(html, />生成</);
});

test('selected create template renders in the full editor workbench', () => {
  const template = templateById('ecommerce-white-bg') ?? CREATE_TEMPLATES[0];
  const location: StudioLocation = {
    ...baseLocation,
    t3: { kind: 'workflow', id: 'ecommerce-white-bg' },
    composer: {
      kind: 'create',
      preset: {
        id: 'ecommerce-white-bg',
        t1: 'create',
        t2: 'ecommerce',
      },
    },
  };
  const html = renderToStaticMarkup(
    <AuthProvider>
      <TaskCenterProvider>
        <CreateEditorWorkbench
          location={location}
          template={template}
          onLocationChange={() => undefined}
          onClose={() => undefined}
        />
      </TaskCenterProvider>
    </AuthProvider>,
  );

  assert.match(html, /创建编辑器/);
  assert.match(html, /最近结果/);
  assert.match(html, /提示词/);
  assert.match(html, />生成</);
  assert.doesNotMatch(html, /模板画廊/);
});

test('template selection payload preserves the selected template preset', () => {
  const template = templateById('ecommerce-white-bg') ?? CREATE_TEMPLATES[0];
  const item = templateToDemoItem(template);

  assert.equal(item.id, template.id);
  assert.equal(item.title, template.title);
  assert.equal(item.description, template.useCase);
  assert.equal(item.kind, 'workflow');
  assert.equal(item.composer, 'create');
  assert.deepEqual(item.actions, template.quickActions);
  assert.deepEqual(item.preset, {
    id: template.id,
    title: template.title,
    scenario: template.scenario,
    useCase: template.useCase,
    aspectRatio: template.aspectRatios[0] ?? '',
    promptTemplate: template.promptTemplate,
  });
});

test('required file inputs block submission until a file is present', () => {
  const template = templateById('ecommerce-white-bg') ?? CREATE_TEMPLATES[0];
  const missing = missingRequiredTemplateInputs(template, {}, {});
  assert.deepEqual(missing.map((input) => input.label), ['商品图']);

  const file = new File(['image'], 'product.webp', { type: 'image/webp' });
  assert.deepEqual(missingRequiredTemplateInputs(template, {}, { productImage: file }), []);
});

test('all create template aspect ratios map to provider sizes', () => {
  const unsupported = CREATE_TEMPLATES.flatMap((template) =>
    template.aspectRatios
      .filter((ratio) => !isSupportedImagePreset('FAST', ratio))
      .map((ratio) => `${template.id}:${ratio}`),
  );

  assert.deepEqual(unsupported, []);
});
