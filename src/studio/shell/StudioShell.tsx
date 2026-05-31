import type { ReactNode } from 'react';
import type { StudioLocation } from '../app/studioLocation';
import { LeftNav } from './LeftNav';

export function StudioShell({
  location,
  onLocationChange,
  children,
}: {
  location: StudioLocation;
  onLocationChange: (next: StudioLocation) => void;
  children: ReactNode;
}) {
  return (
    <div className="h-[calc(100vh_-_var(--studio-topnav-h))] overflow-hidden bg-[#0d0d0b] text-[#f4f0ea]">
      <div className="flex h-full min-h-0">
        <LeftNav location={location} onChange={onLocationChange} />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
