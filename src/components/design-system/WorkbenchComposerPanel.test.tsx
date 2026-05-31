import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkbenchComposerPanel } from './WorkbenchComposerPanel';

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

test('hides payload preview by default', () => {
  const html = renderToStaticMarkup(
    <WorkbenchComposerPanel
      active
      emptyDescription="empty"
      payload={{ id: 'portrait-originals', title: '人像图' }}
    />,
  );

  assert.doesNotMatch(html, /portrait-originals/);
  assert.doesNotMatch(html, /ds-workbench-composer-payload/);
});

test('shows payload preview only when explicitly requested', () => {
  const html = renderToStaticMarkup(
    <WorkbenchComposerPanel
      active
      emptyDescription="empty"
      payload={{ id: 'portrait-originals', title: '人像图' }}
      showPayloadPreview
    />,
  );

  assert.match(html, /portrait-originals/);
  assert.match(html, /ds-workbench-composer-payload/);
});

test('does not render a primary button without a primary action', () => {
  const html = renderToStaticMarkup(
    <WorkbenchComposerPanel active emptyDescription="empty" />,
  );

  assert.doesNotMatch(html, /<button/);
});
