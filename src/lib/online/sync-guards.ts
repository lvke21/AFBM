import type { OnlineDepthChartEntry } from "./online-league-types";

export function isSafeOnlineSyncId(id: string | null | undefined): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{3,80}$/.test(id);
}

export function toOnlineSyncError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }

  return new Error(fallbackMessage);
}

type OrderedAsyncEmitter<T> = {
  emit(load: () => Promise<T> | T): void;
  close(): void;
};

export function createOrderedAsyncEmitter<T>(
  onNext: (value: T) => void,
  onError?: (error: Error) => void,
  fallbackMessage = "Online-Daten konnten nicht synchronisiert werden.",
): OrderedAsyncEmitter<T> {
  let active = true;
  let sequence = 0;

  return {
    emit(load) {
      const currentSequence = ++sequence;

      Promise.resolve()
        .then(load)
        .then((value) => {
          if (active && currentSequence === sequence) {
            onNext(value);
          }
        })
        .catch((error) => {
          if (active && currentSequence === sequence) {
            onError?.(toOnlineSyncError(error, fallbackMessage));
          }
        });
    },
    close() {
      active = false;
      sequence += 1;
    },
  };
}

export function createCoalescedAsyncEmitter<T>(
  onNext: (value: T) => void,
  onError?: (error: Error) => void,
  fallbackMessage = "Online-Daten konnten nicht synchronisiert werden.",
  delayMs = 25,
): OrderedAsyncEmitter<T> {
  const inner = createOrderedAsyncEmitter(onNext, onError, fallbackMessage);
  let active = true;
  let pendingLoad: (() => Promise<T> | T) | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    pendingTimer = null;

    if (!active || !pendingLoad) {
      pendingLoad = null;
      return;
    }

    const load = pendingLoad;
    pendingLoad = null;
    inner.emit(load);
  }

  return {
    emit(load) {
      pendingLoad = load;

      if (pendingTimer) {
        return;
      }

      pendingTimer = setTimeout(flush, delayMs);
    },
    close() {
      active = false;

      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }

      pendingLoad = null;
      inner.close();
    },
  };
}

function normalizeDepthChartForSync(depthChart: OnlineDepthChartEntry[] | undefined) {
  return (depthChart ?? []).map((entry) => ({
    position: entry.position,
    starterPlayerId: entry.starterPlayerId,
    backupPlayerIds: [...entry.backupPlayerIds],
  }));
}

export function hasSameDepthChartPayload(
  currentDepthChart: OnlineDepthChartEntry[] | undefined,
  nextDepthChart: OnlineDepthChartEntry[],
) {
  return (
    JSON.stringify(normalizeDepthChartForSync(currentDepthChart)) ===
    JSON.stringify(normalizeDepthChartForSync(nextDepthChart))
  );
}
