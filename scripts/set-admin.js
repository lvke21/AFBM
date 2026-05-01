/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require("firebase-admin");

function readUid() {
  const uid = process.argv[2]?.trim();

  if (!uid) {
    throw new Error("Usage: node scripts/set-admin.js <firebase-uid>");
  }

  return uid;
}

function readProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "afbm-staging"
  );
}

async function run() {
  const uid = readUid();
  const projectId = readProjectId();

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims || {};

  await auth.setCustomUserClaims(uid, {
    ...existingClaims,
    admin: true,
  });

  console.log("[set-admin] Firebase admin claim set.");
  console.log(`[set-admin] projectId=${projectId}`);
  console.log(`[set-admin] uid=${uid}`);
  console.log("[set-admin] claim=admin:true");
  console.log("[set-admin] User must refresh ID token, log out/in, or reload after token expiry.");
}

run().catch((error) => {
  console.error("[set-admin] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
