import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { assertRuntimeEnvironment } from "./src/lib/env/runtime-env";

assertRuntimeEnvironment();

const projectRoot = dirname(fileURLToPath(import.meta.url));

function readGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_AFBM_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_AFBM_GIT_COMMIT: readGitCommit(),
  },
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
};

export default nextConfig;
