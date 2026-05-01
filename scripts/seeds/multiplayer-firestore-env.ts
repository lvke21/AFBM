export type MultiplayerFirestoreMode = "emulator" | "staging";

export type MultiplayerFirestoreEnvironment = {
  mode: MultiplayerFirestoreMode;
  projectId: string;
  emulatorHost?: string;
  resetAllowed: boolean;
};

const STAGING_PROJECT_ID = "afbm-staging";
const DEFAULT_EMULATOR_PROJECT_ID = "demo-afbm";
const DEFAULT_EMULATOR_HOST = "127.0.0.1:8080";
const OPERATION_TIMEOUT_MS = 10_000;

function readUseEmulator(env: Record<string, string | undefined>) {
  if (env.USE_FIRESTORE_EMULATOR === "true") {
    return true;
  }

  if (env.USE_FIRESTORE_EMULATOR === "false") {
    return false;
  }

  throw new Error(
    "USE_FIRESTORE_EMULATOR must be set to true for emulator or false for staging.",
  );
}

function readProjectId(env: Record<string, string | undefined>) {
  return env.FIREBASE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

export function configureMultiplayerFirestoreEnvironment(
  options: { allowReset?: boolean } = {},
  env: Record<string, string | undefined> = process.env,
): MultiplayerFirestoreEnvironment {
  if (env.NODE_ENV === "production" || env.AFBM_DEPLOY_ENV === "production") {
    throw new Error("Refusing multiplayer seed workflow in production.");
  }

  const useEmulator = readUseEmulator(env);

  if (useEmulator) {
    env.FIRESTORE_EMULATOR_HOST ??= DEFAULT_EMULATOR_HOST;
    env.FIREBASE_PROJECT_ID ??= readProjectId(env) ?? DEFAULT_EMULATOR_PROJECT_ID;

    const projectId = readProjectId(env);
    const emulatorHost = env.FIRESTORE_EMULATOR_HOST ?? env.FIREBASE_EMULATOR_HOST;

    if (!projectId || !projectId.startsWith("demo-")) {
      throw new Error(
        `Emulator multiplayer seed requires a demo-* project, got "${projectId ?? "<missing>"}".`,
      );
    }

    if (!emulatorHost) {
      throw new Error("Emulator multiplayer seed requires FIRESTORE_EMULATOR_HOST.");
    }

    return {
      mode: "emulator",
      projectId,
      emulatorHost,
      resetAllowed: true,
    };
  }

  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_EMULATOR_HOST) {
    throw new Error(
      "Staging multiplayer seed requires USE_FIRESTORE_EMULATOR=false and no FIRESTORE_EMULATOR_HOST/FIREBASE_EMULATOR_HOST.",
    );
  }

  const projectId = readProjectId(env);

  if (projectId !== STAGING_PROJECT_ID) {
    throw new Error(
      `Staging multiplayer seed requires GOOGLE_CLOUD_PROJECT=${STAGING_PROJECT_ID}, got "${projectId ?? "<missing>"}".`,
    );
  }

  env.FIREBASE_PROJECT_ID ??= projectId;
  env.GOOGLE_CLOUD_PROJECT ??= projectId;

  const resetAllowed = options.allowReset === true && env.CONFIRM_STAGING_SEED === "true";

  if (options.allowReset && !resetAllowed) {
    throw new Error("Staging reset requires CONFIRM_STAGING_SEED=true.");
  }

  return {
    mode: "staging",
    projectId,
    resetAllowed,
  };
}

export function logMultiplayerFirestoreEnvironment(
  environment: MultiplayerFirestoreEnvironment,
  action: string,
) {
  console.log(`[multiplayer-seed] action=${action}`);
  console.log(`[multiplayer-seed] mode=${environment.mode}`);
  console.log(`[multiplayer-seed] projectId=${environment.projectId}`);
  console.log(
    `[multiplayer-seed] FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST ?? "<unset>"}`,
  );
  console.log(`[multiplayer-seed] resetAllowed=${environment.resetAllowed}`);
}

export async function withMultiplayerFirestoreTimeout<T>(
  operation: Promise<T>,
  label: string,
  environment: MultiplayerFirestoreEnvironment,
  timeoutMs = OPERATION_TIMEOUT_MS,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          const target =
            environment.mode === "emulator"
              ? `Firestore emulator at ${environment.emulatorHost}`
              : `Firebase staging project ${environment.projectId}`;
          reject(
            new Error(`Timed out after ${timeoutMs}ms while trying to ${label}. Target: ${target}.`),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
