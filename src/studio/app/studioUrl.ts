import type { StudioLocation, StudioT1 } from './studioLocation';
import { defaultT2 } from './studioNav';
import { ASSETS_ROUTE, CREATE_ROUTE, EXPLORE_ROUTE, REDRAW_ROUTE, USER_ROUTE } from './studioRoutes';

// Shell surfaces whose t1 maps 1:1 to a top-level route. `inspiration` lives on
// its own `/explore` surface, not inside the studio shell.
const ROUTE_BY_T1: Partial<Record<StudioT1, string>> = {
  create: CREATE_ROUTE,
  redraw: REDRAW_ROUTE,
  assets: ASSETS_ROUTE,
  user: USER_ROUTE,
};

export const SHELL_T1_BY_ROUTE: Partial<Record<string, StudioT1>> = {
  [CREATE_ROUTE]: 'create',
  [REDRAW_ROUTE]: 'redraw',
  [ASSETS_ROUTE]: 'assets',
  [USER_ROUTE]: 'user',
};

// Build the URL path that represents a studio location (surface + sub-tab).
// Editor/selection state (t3/composer) is intentionally not encoded.
export function locationToPath(location: StudioLocation): string {
  if (location.t1 === 'inspiration') return EXPLORE_ROUTE;
  const t1 = location.t1 ?? 'create';
  const route = ROUTE_BY_T1[t1] ?? CREATE_ROUTE;
  const t2 = location.t2 ?? defaultT2(t1);
  return t2 ? `${route}/${t2}` : route;
}

// Parse a pathname back into shell surface + sub-tab. Returns null for
// non-shell routes (e.g. /explore), which the caller leaves untouched.
export function parseStudioPath(pathname: string): { t1: StudioT1; t2: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  const t1 = SHELL_T1_BY_ROUTE[`/${parts[0] ?? ''}`];
  if (!t1) return null;
  const t2 = parts[1] ?? defaultT2(t1) ?? '';
  return { t1, t2 };
}
