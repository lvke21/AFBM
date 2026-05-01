/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require("firebase-admin");

const DEFAULT_PROJECT_ID = "afbm-staging";

function printHelp() {
  console.log(`Usage:
  node scripts/set-admin.js --project afbm-staging <firebase-uid>
  GOOGLE_CLOUD_PROJECT=afbm-staging npm run firebase:set-admin -- --project afbm-staging <firebase-uid>

Options:
  --project <projectId>   Firebase project id. Defaults to GOOGLE_CLOUD_PROJECT, GCLOUD_PROJECT, FIREBASE_CONFIG, or ${DEFAULT_PROJECT_ID}.
  --help                  Show this help.

Service account alternative:
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/set-admin.js --project afbm-staging <firebase-uid>
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let projectId = null;
  let uid = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      return { help: true, projectId: null, uid: null };
    }

    if (arg === "--project") {
      projectId = args[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--project=")) {
      projectId = arg.slice("--project=".length).trim() || null;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (uid) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    uid = arg.trim();
  }

  return { help: false, projectId, uid };
}

function readProjectFromFirebaseConfig() {
  const rawConfig = process.env.FIREBASE_CONFIG;

  if (!rawConfig) {
    return null;
  }

  try {
    const config = rawConfig.trim().startsWith("{") ? JSON.parse(rawConfig) : null;

    return typeof config?.projectId === "string" ? config.projectId : null;
  } catch {
    return null;
  }
}

function resolveProjectId(cliProjectId) {
  return (
    cliProjectId ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    readProjectFromFirebaseConfig() ||
    DEFAULT_PROJECT_ID
  );
}

function getCredentialMode() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS ? "service-account-json" : "application-default-credentials";
}

function printAdcRecoveryHelp() {
  console.error("");
  console.error("[set-admin] Next steps for local ADC:");
  console.error("  gcloud config set project afbm-staging");
  console.error("  gcloud auth application-default revoke");
  console.error("  gcloud auth application-default login");
  console.error("  gcloud auth application-default set-quota-project afbm-staging");
  console.error("  gcloud services enable identitytoolkit.googleapis.com --project afbm-staging");
  console.error("");
  console.error("[set-admin] Service account alternative:");
  console.error(
    "  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/set-admin.js --project afbm-staging KFy5PrqAzzP7vRbfP4wIDamzbh43",
  );
}

function isAdcQuotaOrIdentityToolkitError(error) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("quota project") ||
    message.includes("identitytoolkit.googleapis.com") ||
    message.includes("SERVICE_DISABLED") ||
    message.includes("PERMISSION_DENIED")
  );
}

async function run() {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printHelp();
    return;
  }

  if (!parsed.uid) {
    printHelp();
    throw new Error("Missing Firebase UID.");
  }

  const projectId = resolveProjectId(parsed.projectId);

  console.log("[set-admin] Starting Firebase admin claim update.");
  console.log(`[set-admin] projectId=${projectId}`);
  console.log(`[set-admin] uid=${parsed.uid}`);
  console.log(`[set-admin] credentialMode=${getCredentialMode()}`);

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  const auth = admin.auth();
  const user = await auth.getUser(parsed.uid);
  const existingClaims = user.customClaims || {};

  await auth.setCustomUserClaims(parsed.uid, {
    ...existingClaims,
    admin: true,
  });

  const updatedUser = await auth.getUser(parsed.uid);

  if (updatedUser.customClaims?.admin !== true) {
    throw new Error("Custom claim write completed but verification read did not return admin:true.");
  }

  console.log("[set-admin] Firebase admin claim set and verified.");
  console.log("[set-admin] customClaims.admin=true");
  console.log("[set-admin] User must refresh ID token, log out/in, or reload after token expiry.");
}

run().catch((error) => {
  console.error("[set-admin] failed:", error instanceof Error ? error.message : error);

  if (isAdcQuotaOrIdentityToolkitError(error)) {
    printAdcRecoveryHelp();
  }

  process.exit(1);
});
