import { useCallback, useEffect, useRef } from 'react';
import { reportMetric } from '../metrics';

interface Dimensions {
  imageCount: number;
  aspectRatio: string;
  imageScale: string;
  imageQuality: string;
  hasReferences: boolean;
  usedTemplate: string | null;
  usedAnalysisPlan: boolean;
}

interface PendingEntry {
  startedAt: number;
  dims: Dimensions;
  taskId: string | null;
}

interface UseGenerationMetricsOptions {
  awaitingTaskId: string | null;
  timeoutMs?: number;
}

interface UseGenerationMetricsResult {
  markSubmitStart: (dims: Dimensions) => void;
  markSubmitSuccess: (taskId: string) => void;
  markSubmitFailed: (error: unknown) => void;
  markFirstValue: (taskId: string, imageCount: number) => void;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'unknown error';
}

export function useGenerationMetrics({
  awaitingTaskId,
  timeoutMs = 180_000,
}: UseGenerationMetricsOptions): UseGenerationMetricsResult {
  const pendingRef = useRef<PendingEntry | null>(null);
  const reportedTaskIds = useRef<Set<string>>(new Set());
  const timeoutHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimeout = useCallback(() => {
    if (timeoutHandleRef.current !== null) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }
  }, []);

  // Watch for timeout when awaitingTaskId is set
  useEffect(() => {
    if (!awaitingTaskId) { clearPendingTimeout(); return; }
    const id = awaitingTaskId;
    timeoutHandleRef.current = setTimeout(() => {
      if (pendingRef.current?.taskId === id) {
        reportMetric('ecom_generate_timeout', {
          taskId: id,
          waitedMs: timeoutMs,
          dims: pendingRef.current.dims,
        });
        pendingRef.current = null;
      }
    }, timeoutMs);
    return () => clearPendingTimeout();
  }, [awaitingTaskId, timeoutMs, clearPendingTimeout]);

  // Cleanup on unmount — report any unresolved pending task as aborted
  useEffect(() => {
    return () => {
      clearPendingTimeout();
      if (pendingRef.current?.taskId) {
        reportMetric('ecom_generate_aborted', {
          taskId: pendingRef.current.taskId,
          dims: pendingRef.current.dims,
        });
      }
    };
  }, [clearPendingTimeout]);

  const markSubmitStart = useCallback((dims: Dimensions): void => {
    // If previous task never resolved, mark it aborted
    if (pendingRef.current?.taskId) {
      reportMetric('ecom_generate_aborted', {
        taskId: pendingRef.current.taskId,
        dims: pendingRef.current.dims,
      });
    }
    pendingRef.current = { startedAt: performance.now(), dims, taskId: null };
  }, []);

  const markSubmitSuccess = useCallback((taskId: string): void => {
    if (!pendingRef.current) return;
    const dims = pendingRef.current.dims;
    pendingRef.current = { ...pendingRef.current, taskId };
    // dims spread before taskId so taskId is never overwritten
    reportMetric('ecom_generate_submitted', { ...dims, taskId });
  }, []);

  const markSubmitFailed = useCallback((error: unknown): void => {
    reportMetric('ecom_generate_failed_submit', {
      errorMessage: toMessage(error),
      dims: pendingRef.current?.dims ?? null,
    });
    pendingRef.current = null;
    clearPendingTimeout();
  }, [clearPendingTimeout]);

  const markFirstValue = useCallback((taskId: string, imageCountReceived: number): void => {
    if (reportedTaskIds.current.has(taskId)) return; // idempotent
    const pending = pendingRef.current;
    if (!pending || pending.taskId !== taskId) return;
    const ttfvMs = Math.round(performance.now() - pending.startedAt);
    reportMetric('ecom_generate_first_value', {
      taskId,
      ttfvMs,
      imageCountReceived,
      dims: pending.dims,
    });
    reportedTaskIds.current.add(taskId);
    pendingRef.current = null;
    clearPendingTimeout();
  }, [clearPendingTimeout]);

  return { markSubmitStart, markSubmitSuccess, markSubmitFailed, markFirstValue };
}
