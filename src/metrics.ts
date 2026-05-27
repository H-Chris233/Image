/**
 * Metrics reporting adapter.
 *
 * Currently logs to console in development only.
 * Replace the implementation of `reportMetric` when a real backend collector
 * (PostHog, Mixpanel, custom /api/metrics endpoint, etc.) is available —
 * no changes required in calling code.
 */

export function reportMetric(event: string, payload: Record<string, unknown>): void {
  try {
    if (import.meta.env.DEV) {
      console.info('[metrics]', event, payload);
    }
  } catch {
    // swallow — metrics must never affect the main flow
  }
}
