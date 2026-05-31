export const ROOT_ROUTE = '/';
export const EXPLORE_ROUTE = '/explore';
export const CREATE_ROUTE = '/create';
export const ASSETS_ROUTE = '/assets';
export const REDRAW_ROUTE = '/redraw';
export const USER_ROUTE = '/user';
export const STUDIO_COMPAT_ROUTE = '/studio';

export const STUDIO_ROUTE_POLICY = {
  boot: {
    route: ROOT_ROUTE,
    role: 'studio-boot',
  },
  t0: {
    route: EXPLORE_ROUTE,
    role: 'marketing-inspiration',
    autoAnnouncement: 'manual-only',
  },
  shell: {
    routes: [`${CREATE_ROUTE}/*`, `${ASSETS_ROUTE}/*`, `${REDRAW_ROUTE}/*`, `${USER_ROUTE}/*`],
    role: 'studio-shell-split',
  },
  compatibility: {
    route: `${STUDIO_COMPAT_ROUTE}/*`,
    role: 'studio-shell-compat',
  },
} as const;

export function isStudioBootRoute(pathname: string) {
  return pathname === ROOT_ROUTE;
}

export function isExploreRoute(pathname: string) {
  return pathname === EXPLORE_ROUTE || pathname.startsWith(`${EXPLORE_ROUTE}/`);
}

export function isCreateRoute(pathname: string) {
  return pathname === CREATE_ROUTE || pathname.startsWith(`${CREATE_ROUTE}/`);
}

export function isAssetsRoute(pathname: string) {
  return pathname === ASSETS_ROUTE || pathname.startsWith(`${ASSETS_ROUTE}/`);
}

export function isRedrawRoute(pathname: string) {
  return pathname === REDRAW_ROUTE || pathname.startsWith(`${REDRAW_ROUTE}/`);
}

export function isUserRoute(pathname: string) {
  return pathname === USER_ROUTE || pathname.startsWith(`${USER_ROUTE}/`);
}

export function isStudioCompatRoute(pathname: string) {
  return pathname === STUDIO_COMPAT_ROUTE || pathname.startsWith(`${STUDIO_COMPAT_ROUTE}/`);
}

export function isStudioShellRoute(pathname: string) {
  return isCreateRoute(pathname) || isAssetsRoute(pathname) || isRedrawRoute(pathname) || isUserRoute(pathname) || isStudioCompatRoute(pathname);
}

export function isStudioEntryRoute(pathname: string) {
  return isStudioBootRoute(pathname) || isExploreRoute(pathname);
}

export function isStudioExperienceRoute(pathname: string) {
  return isExploreRoute(pathname) || isStudioShellRoute(pathname);
}

export function isStudioIsolatedRoute(pathname: string) {
  return isStudioBootRoute(pathname) || isStudioExperienceRoute(pathname);
}

export function suppressesAutoAnnouncement(pathname: string) {
  return isStudioBootRoute(pathname) || isExploreRoute(pathname);
}
