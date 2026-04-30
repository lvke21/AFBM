type RuntimeEnv = Record<string, string | undefined>;

export type DeployEnvironment = "local" | "staging" | "production";

const DEPLOY_ENVIRONMENTS = new Set<DeployEnvironment>(["local", "staging", "production"]);
const SECRET_PLACEHOLDERS = new Set([
  "",
  "replace-with-a-long-random-string",
  "change-me",
  "changeme",
  "secret",
  "password",
  "e2e-admin-code",
  "demo-api-key",
]);
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const EMULATOR_ENV_NAMES = [
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIREBASE_EMULATOR_HUB",
  "FIREBASE_FIRESTORE_EMULATOR_ADDRESS",
  "NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST",
  "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST",
] as const;
const PRODUCTION_DISABLED_FLAGS = [
  "FIRESTORE_PREVIEW_DRY_RUN",
  "FIRESTORE_PREVIEW_CONFIRM_WRITE",
  "FIRESTORE_PREVIEW_CONFIRM_DELETE",
  "FIRESTORE_CLOUD_SEED_CONFIRM",
  "FIRESTORE_CLOUD_SEED_ALLOW_OVERWRITE",
  "FIRESTORE_CLOUD_SEED_ALLOW_PRODUCTION",
] as const;
const FIREBASE_PUBLIC_ENV_NAMES = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export class RuntimeEnvironmentError extends Error {
  constructor(readonly issues: string[]) {
    super(`Unsafe runtime environment:\n- ${issues.join("\n- ")}`);
  }
}

export function readDeployEnvironment(env: RuntimeEnv = process.env): DeployEnvironment {
  const rawDeployEnvironment = env.AFBM_DEPLOY_ENV ?? env.NEXT_PUBLIC_AFBM_DEPLOY_ENV;

  if (rawDeployEnvironment) {
    if (DEPLOY_ENVIRONMENTS.has(rawDeployEnvironment as DeployEnvironment)) {
      return rawDeployEnvironment as DeployEnvironment;
    }

    throw new RuntimeEnvironmentError([
      `AFBM_DEPLOY_ENV must be one of local, staging, production. Received "${rawDeployEnvironment}".`,
    ]);
  }

  return env.NODE_ENV === "production" ? "production" : "local";
}

export function assertRuntimeEnvironment(env: RuntimeEnv = process.env) {
  const deployEnvironment = readDeployEnvironment(env);

  if (deployEnvironment === "local") {
    return { deployEnvironment };
  }

  const issues: string[] = [];
  const requireStrongSecret = (name: string, minimumLength = 24) => {
    const value = env[name]?.trim() ?? "";

    if (!value || SECRET_PLACEHOLDERS.has(value.toLowerCase()) || value.length < minimumLength) {
      issues.push(`${name} must be set from a server-side secret store and be at least ${minimumLength} characters.`);
    }

    return value;
  };
  const requirePublicValue = (name: string) => {
    const value = env[name]?.trim() ?? "";

    if (!value || SECRET_PLACEHOLDERS.has(value.toLowerCase())) {
      issues.push(`${name} must be set explicitly for ${deployEnvironment}.`);
    }

    return value;
  };

  requireStrongSecret("DATABASE_URL", 16);
  const adminAccessCode = requireStrongSecret("AFBM_ADMIN_ACCESS_CODE", 16);
  const adminSessionSecret = requireStrongSecret("AFBM_ADMIN_SESSION_SECRET", 32);

  if (env.ADMIN_ACCESS_CODE) {
    issues.push("ADMIN_ACCESS_CODE is a legacy alias and must not be set outside local development; use AFBM_ADMIN_ACCESS_CODE.");
  }

  if (adminAccessCode && adminAccessCode === adminSessionSecret) {
    issues.push("AFBM_ADMIN_SESSION_SECRET must be distinct from AFBM_ADMIN_ACCESS_CODE.");
  }

  for (const name of EMULATOR_ENV_NAMES) {
    if (env[name]) {
      issues.push(`${name} must not be set in ${deployEnvironment}.`);
    }
  }

  for (const name of PRODUCTION_DISABLED_FLAGS) {
    if (truthy(env[name])) {
      issues.push(`${name}=true is disabled in ${deployEnvironment}.`);
    }
  }

  const serverOnlineBackend = env.AFBM_ONLINE_BACKEND;
  const publicOnlineBackend = env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND;
  if (serverOnlineBackend === "local" || publicOnlineBackend === "local") {
    issues.push("Online backend mode must not be local outside local development.");
  }

  if (env.DATA_BACKEND === "firestore") {
    requireStrongSecret("FIREBASE_CLIENT_EMAIL", 16);
    requireStrongSecret("FIREBASE_PRIVATE_KEY", 64);
  }

  if (deployEnvironment === "production") {
    for (const name of FIREBASE_PUBLIC_ENV_NAMES) {
      requirePublicValue(name);
    }

    if (isDemoFirebaseProject(env.FIREBASE_PROJECT_ID) || isDemoFirebaseProject(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)) {
      issues.push("Production must not use demo-* Firebase project ids.");
    }

    if (env.DATA_BACKEND === "firestore" && !truthy(env.AFBM_ENABLE_PRODUCTION_FIRESTORE)) {
      issues.push("DATA_BACKEND=firestore is blocked in production unless AFBM_ENABLE_PRODUCTION_FIRESTORE=true is explicitly set.");
    }
  }

  if (issues.length > 0) {
    throw new RuntimeEnvironmentError(issues);
  }

  return { deployEnvironment };
}

function isDemoFirebaseProject(value: string | undefined) {
  return (value ?? "").startsWith("demo-");
}

function truthy(value: string | undefined) {
  return TRUE_VALUES.has((value ?? "").toLowerCase());
}
