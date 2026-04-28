const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const PRODUCTION_PROJECT_PATTERN = /(^|[-_])(prod|production)([-_]|$)/i;

export type FirestorePreviewGuardResult =
  | {
      mode: "emulator";
      emulatorHost: string;
      projectId: string;
    }
  | {
      mode: "preview";
      projectId: string;
    };

export function readFirestoreProjectId(env: Record<string, string | undefined> = process.env) {
  return env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function parseFirestorePreviewAllowlist(
  env: Record<string, string | undefined> = process.env,
) {
  return new Set(
    (env.FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function assertFirestorePreviewOrEmulatorAllowed(
  env: Record<string, string | undefined> = process.env,
): FirestorePreviewGuardResult {
  const emulatorHost = env.FIRESTORE_EMULATOR_HOST ?? env.FIREBASE_EMULATOR_HOST;
  const projectId = readFirestoreProjectId(env);

  if (emulatorHost) {
    if (!projectId || !projectId.startsWith("demo-")) {
      throw new Error(
        `Firestore emulator access requires a demo-* Firebase project id. Received "${projectId ?? "<missing>"}".`,
      );
    }

    return {
      emulatorHost,
      mode: "emulator",
      projectId,
    };
  }

  if (!truthy(env.FIRESTORE_PREVIEW_DRY_RUN)) {
    throw new Error(
      "Non-emulator Firestore access requires FIRESTORE_PREVIEW_DRY_RUN=true and an allowlisted staging project.",
    );
  }

  if (env.NODE_ENV === "production") {
    throw new Error("Firestore preview dry-run access is blocked when NODE_ENV=production.");
  }

  if (!projectId) {
    throw new Error("Firestore preview dry-run access requires FIREBASE_PROJECT_ID.");
  }

  const productionProjectId = env.FIREBASE_PRODUCTION_PROJECT_ID;
  if (
    projectId === productionProjectId ||
    PRODUCTION_PROJECT_PATTERN.test(projectId)
  ) {
    throw new Error(`Refusing Firestore preview dry-run access to production-like project "${projectId}".`);
  }

  const allowlist = parseFirestorePreviewAllowlist(env);
  if (!allowlist.has(projectId)) {
    throw new Error(
      `Firestore preview project "${projectId}" is not in FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS.`,
    );
  }

  return {
    mode: "preview",
    projectId,
  };
}

function truthy(value: string | undefined) {
  return TRUE_VALUES.has((value ?? "").toLowerCase());
}
