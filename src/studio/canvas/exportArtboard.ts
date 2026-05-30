import type { Editor, TLShapeId } from 'tldraw';

export async function exportCurrentArtboardSvg(editor: Editor) {
  const shapeIds = editor.getCurrentPageShapesSorted().map((shape) => shape.id as TLShapeId);
  if (shapeIds.length === 0) return null;
  return editor.getSvgString(shapeIds, { background: true, padding: 24 });
}

