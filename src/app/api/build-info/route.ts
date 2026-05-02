import { NextResponse } from "next/server";

import packageJson from "../../../../package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const moduleLoadTime = new Date().toISOString();

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim() ?? null;
}

export async function GET() {
  const buildTime = firstNonEmpty(
    process.env.AFBM_BUILD_TIME,
    process.env.BUILD_TIME,
    process.env.NEXT_PUBLIC_AFBM_BUILD_TIME,
  ) ?? moduleLoadTime;
  const commit = firstNonEmpty(
    process.env.AFBM_GIT_COMMIT,
    process.env.GIT_COMMIT,
    process.env.SOURCE_VERSION,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.NEXT_PUBLIC_AFBM_GIT_COMMIT,
  );
  const environment = firstNonEmpty(process.env.AFBM_DEPLOY_ENV, process.env.NEXT_PUBLIC_AFBM_DEPLOY_ENV);
  const revision = firstNonEmpty(process.env.K_REVISION, process.env.FIREBASE_APP_HOSTING_REVISION);

  return NextResponse.json({
    ok: Boolean(commit),
    commit,
    buildTime,
    environment,
    revision,
    version: firstNonEmpty(process.env.AFBM_APP_VERSION, process.env.NEXT_PUBLIC_AFBM_APP_VERSION) ?? packageJson.version,
    deployEnv: environment,
    firebaseProjectId: firstNonEmpty(
      process.env.FIREBASE_PROJECT_ID,
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      process.env.GOOGLE_CLOUD_PROJECT,
    ),
  });
}
