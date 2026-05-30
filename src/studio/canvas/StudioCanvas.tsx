import { Tldraw, type Editor } from 'tldraw';
import { studioTldrawComponents } from './tldrawComponents';

export function StudioCanvas({ onMount }: { onMount: (editor: Editor) => void }) {
  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#090908]">
      <Tldraw
        persistenceKey="aethergenix-studio-draft"
        hideUi
        components={studioTldrawComponents}
        onMount={onMount}
      />
    </div>
  );
}
