import type { OnlineDepthChartEntry } from "./online-league-service";

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
