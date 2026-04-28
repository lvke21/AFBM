const REPORT_ROOTS = {
  phase: "docs/reports/phases",
  qa: "docs/reports/qa",
  simulation: "docs/reports/simulations",
  system: "docs/reports/systems",
  outputSimulation: "reports-output/simulations",
  outputTestRun: "reports-output/test-runs",
  outputExport: "reports-output/exports",
} as const;

type ReportKind = keyof typeof REPORT_ROOTS;

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function usage() {
  return [
    "Usage:",
    "  npx tsx scripts/tools/generate-report-path.ts <kind> <domain> <topic> [type] [version]",
    "",
    "Kinds:",
    `  ${Object.keys(REPORT_ROOTS).join(", ")}`,
    "",
    "Example:",
    "  npx tsx scripts/tools/generate-report-path.ts phase roster-management ap43 report",
  ].join("\\n");
}

const [, , kindArg, domainArg, topicArg, typeArg = "report", versionArg] = process.argv;
const kind = kindArg as ReportKind;

if (!kind || !REPORT_ROOTS[kind] || !domainArg || !topicArg) {
  console.error(usage());
  process.exit(1);
}

const parts = [domainArg, topicArg, typeArg, versionArg].filter(Boolean).map(slug);

if (kind === "phase" && parts[0] !== "phase") {
  parts.unshift("phase");
}

if (kind === "qa" && parts[0] !== "qa") {
  parts.unshift("qa");
}

if (kind === "simulation" && parts[0] !== "sim") {
  parts.unshift("sim");
}

console.log(`${REPORT_ROOTS[kind]}/${parts.join("-")}.md`);
