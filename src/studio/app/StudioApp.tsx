import { useEffect, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useRevealScope } from '../../components/design-system';
import { studioLocation, type StudioLocation } from './studioLocation';
import { navItemById } from './studioNav';
import { EXPLORE_ROUTE } from './studioRoutes';
import { locationToPath, parseStudioPath } from './studioUrl';
import { StudioShell } from '../shell/StudioShell';
import { CreateTemplateWorkspace } from '../create/CreateTemplateWorkspace';
import { CreateEditorWorkbench } from '../create/CreateEditorWorkbench';
import { templateFromLocation } from '../create/createTemplateResolver';
import { RedrawWorkspace } from '../redraw/RedrawWorkspace';
import { AssetLibraryWorkspace } from '../assets/AssetLibraryWorkspace';
import { UserWorkspace } from '../user/UserWorkspace';
import { InspirationWorkspace } from '../inspiration/InspirationSurface';

export function StudioApp({ initialLocation }: { initialLocation: StudioLocation }) {
  const [location, setLocation] = useState(initialLocation);
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  // Mirror a navigation onto the URL so the surface + sub-tab are shareable and
  // survive refresh/back/forward. Editor/selection state stays in component state.
  function applyLocation(next: StudioLocation) {
    if (next.t1 === 'inspiration') {
      navigate(EXPLORE_ROUTE);
      return;
    }
    setLocation(next);
    const demo = new URLSearchParams(routerLocation.search).get('demo');
    const search = demo ? `?demo=${demo}` : '';
    const path = locationToPath(next);
    if (path !== routerLocation.pathname || search !== routerLocation.search) {
      navigate(`${path}${search}`);
    }
  }

  // Keep state in sync when the URL changes outside of applyLocation
  // (browser back/forward, manual edit, deep link).
  useEffect(() => {
    const parsed = parseStudioPath(routerLocation.pathname);
    if (!parsed) return;
    const current = locationRef.current;
    if (current.t1 === parsed.t1 && current.t2 === parsed.t2) return;
    setLocation(studioLocation('studio', parsed.t1, parsed.t2));
  }, [routerLocation.pathname]);

  const createEditing = location.t1 === 'create' && Boolean(location.t3 || location.composer);

  if (createEditing) {
    return (
      <CreateEditorWorkbench
        location={location}
        template={templateFromLocation(location, location.t2)}
        onLocationChange={applyLocation}
        onClose={() => applyLocation({ ...location, t3: null, composer: null })}
      />
    );
  }

  return (
    <StudioShell location={location} onLocationChange={applyLocation}>
      <Stage location={location} onLocationChange={applyLocation} />
    </StudioShell>
  );
}

function Stage({
  location,
  onLocationChange,
}: {
  location: StudioLocation;
  onLocationChange: (next: StudioLocation) => void;
}) {
  const item = navItemById(location.t1);
  const child = item.children.find((entry) => entry.id === location.t2) ?? item.children[0];
  const revealScope = useRevealScope<HTMLDivElement>({
    trigger: 'mount',
    itemSelector: ':scope > *',
    deps: [location.t1, location.t2],
    y: 16,
    duration: 0.5,
    stagger: 0.08,
  });

  return (
    <div ref={revealScope} key={`${location.t1}-${location.t2}`} className="@container mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 px-5 py-5">
      <header className="border-b border-white/[0.08] pb-4">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={`${item.label}分区`}>
          {item.children.map((entry) => {
            const active = entry.id === child?.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                className={`ds-motion-press h-10 shrink-0 rounded-md border px-4 text-sm font-semibold transition ${
                  active
                    ? 'border-lime/45 bg-lime/15 text-lime'
                    : 'border-white/[0.08] bg-white/[0.035] text-[#aaa49a] hover:border-white/[0.16] hover:text-[#f4f0ea]'
                }`}
                onClick={() =>
                  onLocationChange({
                    ...location,
                    t2: entry.id,
                    t3: null,
                    composer: null,
                  })
                }
              >
                {entry.label}
              </button>
            );
          })}
        </nav>
      </header>

      {item.id === 'create' ? (
        <CreateTemplateWorkspace
          scenarioId={child?.id}
          location={location}
          onSelectItem={(demoItem) =>
            onLocationChange({
              ...location,
              t3: { kind: demoItem.kind, id: demoItem.id },
              composer: demoItem.composer
                ? {
                    kind: demoItem.composer,
                    preset: {
                      ...demoItem.preset,
                      t1: item.id,
                      t2: child?.id ?? '',
                    },
                  }
                : null,
            })
          }
          onClearSelection={() =>
            onLocationChange({
              ...location,
              t3: null,
              composer: null,
            })
          }
        />
      ) : item.id === 'redraw' ? (
        <RedrawWorkspace location={location} onLocationChange={onLocationChange} />
      ) : item.id === 'assets' ? (
        <AssetLibraryWorkspace location={location} onLocationChange={onLocationChange} />
      ) : item.id === 'user' ? (
        <UserWorkspace location={location} />
      ) : item.id === 'inspiration' ? (
        <InspirationWorkspace />
      ) : null}
    </div>
  );
}
