import { logDataBackendConfiguration } from "./firestoreOperationalLogger";
import { assertFirestorePreviewOrEmulatorAllowed } from "@/lib/firebase/previewGuard";

export function readFirestoreEmulatorConfig(
  env: Record<string, string | undefined> = process.env,
) {
  try {
    const target = assertFirestorePreviewOrEmulatorAllowed(env);

    if (target.mode === "emulator") {
      return {
        emulatorHost: target.emulatorHost,
        projectId: target.projectId,
      };
    }

    return {
      emulatorHost: null,
      projectId: target.projectId,
    };
  } catch (error) {
    logDataBackendConfiguration({
      backend: "firestore",
      reason: error instanceof Error ? error.message : "firestore-target-guard-failed",
    });
    throw error;
  }
}

export function assertFirestoreEmulatorOnly() {
  return readFirestoreEmulatorConfig();
}
