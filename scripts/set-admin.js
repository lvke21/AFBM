const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "afbm-staging",
});

const uid = "KFy5PrqAzzP7vRbfP4wIDamzbh43";

async function run() {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log("Admin gesetzt für:", uid);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});