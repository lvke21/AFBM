#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BUILD_DIR = ".next";
const MANIFEST_PATH = path.join(BUILD_DIR, "app-build-manifest.json");

const BUDGETS = [
  {
    name: "Online",
    budgetKb: 315,
    routes: ["/online/page", "/online/league/[leagueId]/page"],
  },
  {
    name: "Draft",
    budgetKb: 295,
    routes: ["/online/league/[leagueId]/draft/page"],
  },
  {
    name: "Admin",
    budgetKb: 285,
    optionalRoutes: ["/admin/page"],
    routes: ["/admin/league/[leagueId]/page"],
  },
];

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `${MANIFEST_PATH} fehlt. Fuehre zuerst "npm run build" aus.`,
    );
  }

  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function gzipSize(filePath) {
  return zlib.gzipSync(fs.readFileSync(filePath)).length;
}

function resolveRoute(route, pages, optional = false) {
  const files = pages[route];

  if (!files) {
    if (optional) {
      return null;
    }

    throw new Error(`Route ${route} fehlt in ${MANIFEST_PATH}.`);
  }

  const bytes = files
    .filter((file) => file.endsWith(".js"))
    .reduce((total, file) => {
      const filePath = path.join(BUILD_DIR, file);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Chunk fehlt: ${filePath}`);
      }

      return total + gzipSize(filePath);
    }, 0);

  return {
    bytes,
    optional,
    route,
  };
}

function evaluateBudget(group, pages) {
  const requiredRoutes = group.routes.map((route) => resolveRoute(route, pages));
  const optionalRoutes = (group.optionalRoutes ?? [])
    .map((route) => resolveRoute(route, pages, true))
    .filter(Boolean);
  const routes = [...requiredRoutes, ...optionalRoutes];

  if (routes.length === 0) {
    throw new Error(`${group.name} hat keine budgetierbare Route im Manifest.`);
  }

  const max = routes.reduce(
    (largest, current) => current.bytes > largest.bytes ? current : largest,
    routes[0],
  );
  const budgetBytes = group.budgetKb * 1024;

  return {
    ...group,
    skippedOptionalRoutes: (group.optionalRoutes ?? []).filter((route) => !pages[route]),
    routes,
    max,
    budgetBytes,
    ok: max.bytes <= budgetBytes,
    deltaBytes: max.bytes - budgetBytes,
  };
}

function main() {
  const manifest = readManifest();
  const pages = manifest.pages ?? {};
  const results = BUDGETS.map((budget) => evaluateBudget(budget, pages));

  console.log("Bundle budget check (gzip JS from .next/app-build-manifest.json)");
  console.log("");
  console.log("Area    Budget    Max route gzip    Route");
  console.log("------  --------  --------------    -------------------------------");

  for (const result of results) {
    const status = result.ok ? "OK" : "FAIL";
    console.log(
      `${result.name.padEnd(6)}  ${String(result.budgetKb).padStart(4)} kB   ${formatKb(result.max.bytes).padStart(12)}    ${result.max.route} ${status}`,
    );
  }

  console.log("");
  for (const result of results) {
    for (const route of result.routes) {
      const optionalLabel = route.optional ? " optional" : "";
      console.log(`${result.name.padEnd(6)}  ${formatKb(route.bytes).padStart(8)}  ${route.route}${optionalLabel}`);
    }

    for (const route of result.skippedOptionalRoutes) {
      console.log(`${result.name.padEnd(6)}  ${"skipped".padStart(8)}  ${route} optional`);
    }
  }

  const failed = results.filter((result) => !result.ok);

  if (failed.length > 0) {
    console.error("");
    for (const result of failed) {
      console.error(
        `${result.name} ueberschreitet das Budget um ${formatKb(result.deltaBytes)}.`,
      );
    }
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
