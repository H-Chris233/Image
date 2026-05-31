import { useRevealScope } from '../components/design-system/useRevealScope';

/**
 * Page-level entrance reveal for the design-system route.
 *
 * Thin wrapper over the shared {@link useRevealScope} primitive: the page
 * scrolls on the viewport, so it uses scroll-triggered batches. Component
 * internal motion stays CSS-owned; reduced-motion is handled by the primitive.
 */
export function useDesignSystemReveal<T extends HTMLElement>() {
  return useRevealScope<T>({
    trigger: 'scroll',
    headerSelector: '[data-reveal-header]',
    itemSelector: '[data-reveal]',
    y: 28,
    duration: 0.6,
    stagger: 0.12,
  });
}
