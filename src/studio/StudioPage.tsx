import { useState } from 'react';
import { CreateNewWorkbench, type StudioStartPreset } from './create-new/CreateNewWorkbench';
import { ImageEditorShell } from './image-editor/ImageEditorShell';

export default function StudioPage() {
  const [startPreset, setStartPreset] = useState<StudioStartPreset | null>(null);

  if (!startPreset) {
    return <CreateNewWorkbench onStart={setStartPreset} />;
  }

  return <ImageEditorShell initialPreset={startPreset} onBackToCreate={() => setStartPreset(null)} />;
}
