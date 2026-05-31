import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type RevealScopeOptions = {
  /** 'mount' plays once on mount / deps change; 'scroll' reveals items as they enter the scroller. */
  trigger?: 'mount' | 'scroll';
  /** Elements to reveal, queried within the scope root. */
  itemSelector?: string;
  /** Optional intro: stagger the direct children of this element before the items. */
  headerSelector?: string;
  /** Custom scroll container for 'scroll' mode (defaults to the viewport). */
  scroller?: RefObject<HTMLElement | null>;
  /** Replay dependencies; on change the reveal re-runs (use for keyed / remounted views). */
  deps?: unknown[];
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
};

/**
 * Reusable entrance-reveal primitive built on GSAP.
 *
 * Animations only touch transform/opacity and are skipped entirely under
 * prefers-reduced-motion (content stays visible). Returns a scope ref to
 * attach to the container that holds the revealed items.
 */
export function useRevealScope<T extends HTMLElement>(options: RevealScopeOptions = {}) {
  const {
    trigger = 'scroll',
    itemSelector = '[data-reveal]',
    headerSelector,
    scroller,
    deps,
    y = 24,
    duration = 0.6,
    stagger = 0.1,
    start = 'top 85%',
  } = options;
  const scope = useRef<T>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (headerSelector) {
          const headerChildren = gsap.utils.toArray<HTMLElement>(
            root.querySelectorAll(`${headerSelector} > *`),
          );
          if (headerChildren.length) {
            gsap.from(headerChildren, {
              opacity: 0,
              y: y * 0.6,
              duration: duration * 0.9,
              ease: 'power2.out',
              stagger: stagger * 0.7,
            });
          }
        }

        const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(itemSelector));
        if (!items.length) return;

        if (trigger === 'mount') {
          gsap.from(items, { opacity: 0, y, duration, ease: 'power3.out', stagger });
          return;
        }

        gsap.set(items, { opacity: 0, y: y + 4 });
        ScrollTrigger.batch(items, {
          scroller: scroller?.current ?? undefined,
          start,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: duration + 0.1,
              ease: 'power3.out',
              stagger: stagger + 0.02,
              overwrite: true,
            }),
        });
        ScrollTrigger.refresh();
      });

      return () => mm.revert();
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );

  return scope;
}
