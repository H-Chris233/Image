import 'tldraw/tldraw.css';
import { useState } from 'react';
import { CreateNewWorkbench, type StudioStartPreset } from './create-new/CreateNewWorkbench';
import { StudioShell } from './StudioShell';

export default function StudioPage() {
  const [startPreset, setStartPreset] = useState<StudioStartPreset | null>(null);

  if (!startPreset) {
    return <CreateNewWorkbench onStart={setStartPreset} />;
  }

  return <StudioShell initialPreset={startPreset} onBackToCreate={() => setStartPreset(null)} />;
}
