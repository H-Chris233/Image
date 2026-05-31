export type StudioSurface = 'inspiration' | 'studio';

export type StudioT1 = 'create' | 'redraw' | 'assets' | 'inspiration' | 'user';

export type StudioT3 =
  | {
      kind: 'workflow' | 'scenario' | 'asset' | 'inspiration';
      id: string;
    }
  | null;

export type StudioComposer =
  | {
      kind: 'create' | 'redraw' | 'asset-action';
      preset?: Record<string, unknown>;
    }
  | null;

export type StudioLocation = {
  surface: StudioSurface;
  t1: StudioT1 | null;
  t2: string | null;
  t3?: StudioT3;
  composer?: StudioComposer;
};

export function studioLocation(surface: StudioSurface, t1: StudioT1 | null, t2: string | null = null): StudioLocation {
  return { surface, t1, t2, t3: null, composer: null };
}
