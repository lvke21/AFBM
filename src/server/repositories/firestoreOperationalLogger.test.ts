import { afterEach, describe, expect, it, vi } from "vitest";

import {
  firestoreOperationalLoggingEnabled,
  logDataBackendConfiguration,
  logRepositoryError,
  recordFirestoreOperationalLog,
  withFirestoreRepositoryLogging,
} from "./firestoreOperationalLogger";

describe("firestore operational logger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stays silent unless explicitly enabled", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    recordFirestoreOperationalLog({
      event: "firestore_operation",
      operation: "read-team",
      repository: "teamRepositoryFirestore",
      severity: "info",
    });

    expect(firestoreOperationalLoggingEnabled()).toBe(false);
    expect(consoleInfo).not.toHaveBeenCalled();
  });

  it("logs structured operational events without sensitive metadata", () => {
    vi.stubEnv("AFBM_FIRESTORE_OPERATION_LOG", "true");
    vi.stubEnv("AFBM_REQUEST_ID", "request-123");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logRepositoryError({
      error: new Error("permission denied"),
      metadata: {
        count: 3,
        privateKey: "do-not-log",
        userId: "secret-user",
      },
      operation: "findOwnedByUser",
      repository: "teamRepositoryFirestore",
    });

    expect(consoleError).toHaveBeenCalledWith(
      "[afbm:firestore:ops]",
      expect.stringContaining("\"requestId\":\"request-123\""),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[afbm:firestore:ops]",
      expect.stringContaining("\"privateKey\":\"[redacted]\""),
    );
    expect(consoleError).not.toHaveBeenCalledWith(
      "[afbm:firestore:ops]",
      expect.stringContaining("do-not-log"),
    );
  });

  it("wraps repository calls and rethrows after logging", async () => {
    vi.stubEnv("FIRESTORE_OPERATION_LOGGING", "true");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      withFirestoreRepositoryLogging(
        {
          operation: "startGameForUser",
          repository: "weekMatchStateRepositoryFirestore",
        },
        async () => {
          throw new TypeError("bad state");
        },
      ),
    ).rejects.toThrow("bad state");

    expect(consoleError).toHaveBeenCalledWith(
      "[afbm:firestore:ops]",
      expect.stringContaining("\"event\":\"repository_error\""),
    );
  });

  it("logs backend misconfiguration without secrets", () => {
    vi.stubEnv("AFBM_FIRESTORE_OPERATION_LOG", "1");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logDataBackendConfiguration({
      backend: "firestore",
      reason: "missing-firestore-emulator-host",
    });

    expect(consoleError).toHaveBeenCalledWith(
      "[afbm:firestore:ops]",
      expect.stringContaining("\"data_backend_configuration\""),
    );
  });
});
