import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "docs", "reports", "code-analysis");
const jsonOutputPath = path.join(outputDir, "codebase-size-analysis.json");
const markdownOutputPath = path.join(outputDir, "codebase-size-analysis.md");

const excludedDirectoryNames = new Set([
  ".cache",
  ".firebase",
  ".git",
  ".local",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "firebase-emulator-data",
  "node_modules",
  "playwright-report",
  "reports-output",
  "test-results",
]);

const excludedExactRelativePaths = new Set([
  "firebase-debug.log",
  "firestore-debug.log",
  "next-env.d.ts",
  "package-lock.json",
  "pnpm-lock.yaml",
  "scripts/analyze-codebase-size.mjs",
  "tsconfig.tsbuildinfo",
  "yarn.lock",
]);

const excludedPathPrefixes = [
  "docs/reports/",
];

const includedExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".prisma",
  ".rules",
  ".scss",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const includedExactFilenames = new Set([
  ".env.example",
]);

const configFilenames = new Set([
  ".env.example",
  "apphosting.yaml",
  "docker-compose.yml",
  "eslint.config.mjs",
  "firebase.json",
  "firestore.indexes.json",
  "next.config.ts",
  "package.json",
  "playwright.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "vitest.config.ts",
]);

const sourceCodeExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".prisma",
  ".rules",
  ".scss",
  ".sql",
  ".ts",
  ".tsx",
]);

const estimationCategories = new Set([
  "App-Code",
  "Script",
  "Schema/DB",
  "Sonstiges",
]);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function relativePath(filePath) {
  return toPosixPath(path.relative(projectRoot, filePath));
}

function isExcluded(relative) {
  if (excludedExactRelativePaths.has(relative)) {
    return true;
  }

  if (excludedPathPrefixes.some((prefix) => relative.startsWith(prefix))) {
    return true;
  }

  return relative.split("/").some((segment) => excludedDirectoryNames.has(segment));
}

function shouldIncludeFile(relative) {
  if (isExcluded(relative)) {
    return false;
  }

  const basename = path.posix.basename(relative);
  if (includedExactFilenames.has(basename)) {
    return true;
  }

  return includedExtensions.has(path.posix.extname(relative));
}

function walkDirectory(directory, files = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = relativePath(absolute);

    if (entry.isDirectory()) {
      if (!isExcluded(relative)) {
        walkDirectory(absolute, files);
      }
      continue;
    }

    if (entry.isFile() && shouldIncludeFile(relative)) {
      files.push(absolute);
    }
  }

  return files;
}

function isTestFile(relative) {
  const basename = path.posix.basename(relative);
  return (
    relative.startsWith("e2e/") ||
    relative.startsWith("tests/") ||
    relative.includes("/__tests__/") ||
    /\.test\.[cm]?[jt]sx?$/.test(basename) ||
    /\.spec\.[cm]?[jt]sx?$/.test(basename)
  );
}

function isDocumentation(relative) {
  const ext = path.posix.extname(relative);
  return (
    ext === ".md" ||
    ext === ".mdx" ||
    relative.startsWith("docs/") ||
    relative === "README.md" ||
    relative === "CHANGELOG.md"
  );
}

function isConfig(relative) {
  const basename = path.posix.basename(relative);
  return (
    configFilenames.has(basename) ||
    relative.startsWith("config/") ||
    /\.config\.[cm]?[jt]s$/.test(basename)
  );
}

function isSchemaOrDb(relative) {
  const ext = path.posix.extname(relative);
  return (
    relative.startsWith("prisma/") ||
    relative === "firestore.rules" ||
    ext === ".prisma" ||
    ext === ".sql"
  );
}

function classify(relative) {
  if (isDocumentation(relative)) {
    return "Dokumentation";
  }

  if (isTestFile(relative)) {
    return "Test-Code";
  }

  if (isConfig(relative)) {
    return "Config";
  }

  if (isSchemaOrDb(relative)) {
    return "Schema/DB";
  }

  if (relative.startsWith("scripts/")) {
    return "Script";
  }

  if (
    relative.startsWith("src/") ||
    relative.startsWith("app/") ||
    relative.startsWith("components/") ||
    relative.startsWith("lib/") ||
    relative.startsWith("firebase/") ||
    relative.startsWith("functions/")
  ) {
    return "App-Code";
  }

  return "Sonstiges";
}

function extensionLabel(relative) {
  const basename = path.posix.basename(relative);
  if (basename === ".env.example") {
    return ".env.example";
  }

  const ext = path.posix.extname(relative);
  return ext || "(keine Endung)";
}

function countLines(content) {
  if (content.length === 0) {
    return { lines: 0, nonEmptyLines: 0 };
  }

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n");

  return {
    lines: lines.length,
    nonEmptyLines: lines.filter((line) => line.trim().length > 0).length,
  };
}

function emptySummary() {
  return {
    files: 0,
    lines: 0,
    nonEmptyLines: 0,
    characters: 0,
  };
}

function addToSummary(summary, file) {
  summary.files += 1;
  summary.lines += file.lines;
  summary.nonEmptyLines += file.nonEmptyLines;
  summary.characters += file.characters;
}

function groupBy(files, key) {
  const grouped = {};
  for (const file of files) {
    const groupKey = file[key];
    grouped[groupKey] ??= emptySummary();
    addToSummary(grouped[groupKey], file);
  }

  return Object.fromEntries(
    Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sumWhere(files, predicate) {
  const summary = emptySummary();
  for (const file of files) {
    if (predicate(file)) {
      addToSummary(summary, file);
    }
  }

  return summary;
}

function hoursRange(lines, lowRate, highRate) {
  return {
    minHours: Math.round(lines / highRate),
    maxHours: Math.round(lines / lowRate),
    lowRate,
    highRate,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function formatHours(range) {
  return `${formatNumber(range.minHours)}-${formatNumber(range.maxHours)} h`;
}

function markdownTable(headers, rows) {
  const headerRow = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerRow, separator, ...body].join("\n");
}

function summaryRows(grouped) {
  return Object.entries(grouped).map(([name, summary]) => [
    name,
    formatNumber(summary.files),
    formatNumber(summary.lines),
    formatNumber(summary.nonEmptyLines),
    formatNumber(summary.characters),
  ]);
}

function topRows(files, metric) {
  return files
    .toSorted((left, right) => right[metric] - left[metric])
    .slice(0, 20)
    .map((file, index) => [
      String(index + 1),
      file.path,
      file.category,
      file.extension,
      formatNumber(file.lines),
      formatNumber(file.nonEmptyLines),
      formatNumber(file.characters),
    ]);
}

function createMarkdown(analysis) {
  const {
    generatedAt,
    totals,
    codeOnly,
    productiveCode,
    tests,
    documentation,
    config,
    byExtension,
    byCategory,
    topByLines,
    topByCharacters,
    estimates,
    exclusions,
  } = analysis;

  const estimationBasis = productiveCode.nonEmptyLines;
  const recommendedMin = estimates.complex.minHours;
  const recommendedMax = Math.round(estimates.complex.maxHours * 1.2);

  return `# Codebase Size Analysis

Generated: ${generatedAt}

## Executive Summary

Die Analyse zaehlt echten Projektcode und trennt produktiven Code, Tests, Konfiguration und Dokumentation. Build-Artefakte, Dependencies, Lockfiles, Debug-Logs und generierte Reports sind ausgeschlossen.

- Analysierte Projektdateien gesamt: **${formatNumber(totals.files)}**
- Analysierte Zeilen gesamt: **${formatNumber(totals.lines)}**
- Nicht-leere Zeilen gesamt: **${formatNumber(totals.nonEmptyLines)}**
- Zeichen gesamt: **${formatNumber(totals.characters)}**
- Code-Dateien nach Code-/UI-/Schema-Endungen: **${formatNumber(codeOnly.files)} Dateien**, **${formatNumber(codeOnly.lines)} Zeilen**, **${formatNumber(codeOnly.characters)} Zeichen**
- Produktive nicht-leere Codezeilen fuer die Schaetzung: **${formatNumber(estimationBasis)}**
- Tests separat: **${formatNumber(tests.files)} Dateien**, **${formatNumber(tests.nonEmptyLines)} nicht-leere Zeilen**
- Dokumentation separat: **${formatNumber(documentation.files)} Dateien**, **${formatNumber(documentation.nonEmptyLines)} nicht-leere Zeilen**

## Methodik

Das Script \`scripts/analyze-codebase-size.mjs\` laeuft rekursiv durch das Projekt und erfasst pro Datei Pfad, Dateiendung, Kategorie, Zeilen, nicht-leere Zeilen und Zeichen. Gezahlt werden relevante Projektdateien mit Endungen fuer TypeScript/JavaScript, UI/CSS, JSON/YAML/TOML-Konfiguration, Prisma/SQL/Firestore-Regeln sowie Dokumentation.

Die Arbeitszeit-Schaetzung nutzt produktive nicht-leere Codezeilen aus den Kategorien App-Code, Script, Schema/DB und Sonstiges. Tests, Konfiguration und Dokumentation werden separat ausgewiesen und nicht als produktive Basiszeilen eingerechnet.

## Ausschluesse

Ausgeschlossen sind insbesondere:

- Verzeichnisse: ${exclusions.directories.map((item) => `\`${item}\``).join(", ")}
- Exakte Dateien: ${exclusions.files.map((item) => `\`${item}\``).join(", ")}
- Pfad-Praefixe: ${exclusions.pathPrefixes.map((item) => `\`${item}\``).join(", ")}

## Gesamtzahlen

${markdownTable(
    ["Bereich", "Dateien", "Zeilen", "Nicht-leere Zeilen", "Zeichen"],
    [
      ["Gesamt analysiert", formatNumber(totals.files), formatNumber(totals.lines), formatNumber(totals.nonEmptyLines), formatNumber(totals.characters)],
      ["Code-Dateien nach Endung", formatNumber(codeOnly.files), formatNumber(codeOnly.lines), formatNumber(codeOnly.nonEmptyLines), formatNumber(codeOnly.characters)],
      ["Produktive Schaetzbasis", formatNumber(productiveCode.files), formatNumber(productiveCode.lines), formatNumber(productiveCode.nonEmptyLines), formatNumber(productiveCode.characters)],
      ["Tests", formatNumber(tests.files), formatNumber(tests.lines), formatNumber(tests.nonEmptyLines), formatNumber(tests.characters)],
      ["Konfiguration", formatNumber(config.files), formatNumber(config.lines), formatNumber(config.nonEmptyLines), formatNumber(config.characters)],
      ["Dokumentation", formatNumber(documentation.files), formatNumber(documentation.lines), formatNumber(documentation.nonEmptyLines), formatNumber(documentation.characters)],
    ],
  )}

## Aufteilung Nach Dateitypen

${markdownTable(
    ["Dateityp", "Dateien", "Zeilen", "Nicht-leere Zeilen", "Zeichen"],
    summaryRows(byExtension),
  )}

## Aufteilung Nach Kategorien

${markdownTable(
    ["Kategorie", "Dateien", "Zeilen", "Nicht-leere Zeilen", "Zeichen"],
    summaryRows(byCategory),
  )}

## Groesste Dateien Nach Zeilen

${markdownTable(
    ["#", "Pfad", "Kategorie", "Typ", "Zeilen", "Nicht-leere Zeilen", "Zeichen"],
    topByLines.map((file, index) => [
      String(index + 1),
      file.path,
      file.category,
      file.extension,
      formatNumber(file.lines),
      formatNumber(file.nonEmptyLines),
      formatNumber(file.characters),
    ]),
  )}

## Groesste Dateien Nach Zeichen

${markdownTable(
    ["#", "Pfad", "Kategorie", "Typ", "Zeilen", "Nicht-leere Zeilen", "Zeichen"],
    topByCharacters.map((file, index) => [
      String(index + 1),
      file.path,
      file.category,
      file.extension,
      formatNumber(file.lines),
      formatNumber(file.nonEmptyLines),
      formatNumber(file.characters),
    ]),
  )}

## Arbeitsstunden-Schaetzung

Basis fuer die Rechnung: **${formatNumber(estimationBasis)} produktive nicht-leere Codezeilen**. Die Zahlen sind Naeherungen, keine exakte Rekonstruktion tatsaechlicher Arbeit.

${markdownTable(
    ["Szenario", "Produktivitaet", "Geschaetzte Stunden"],
    [
      ["Schnell umgesetzt / viel Boilerplate", "80-140 produktive Zeilen pro Stunde", formatHours(estimates.fast)],
      ["Normaler professioneller Entwicklungsprozess", "40-80 produktive Zeilen pro Stunde", formatHours(estimates.normal)],
      ["Komplexe App mit Tests, Debugging, Refactoring, UI-Iterationen", "15-40 produktive Zeilen pro Stunde", formatHours(estimates.complex)],
    ],
  )}

Aus technischer Sicht spricht die Codebasis eher fuer das komplexe Szenario: Es gibt eine umfangreiche Next/Firebase-App, Offline- und Online-Flows, Game- und Saison-Simulation, Firestore/Prisma-Migrationspfade, Admin- und Auth-Migrationen, E2E-/Firebase-Tests sowie viele QA- und Seed-Scripte. Unter Einrechnung von Debugging, Refactoring, UI-Iteration und Integrationsaufwand ist eine vorsichtige Delivery-Spanne von **${formatNumber(recommendedMin)}-${formatNumber(recommendedMax)} Stunden** plausibel.

## Belastbarkeit Der Schaetzung

Die Messung der Dateien, Zeilen und Zeichen ist reproduzierbar, solange die Ausschlussliste stabil bleibt. Die Arbeitszeit ist deutlich weniger belastbar: Produktivitaet haengt stark von Vorwissen, vorhandenen Templates, KI-Unterstuetzung, Datenmodell-Klarheit, Testanforderungen und Anzahl der Iterationen ab. Die Schaetzung eignet sich deshalb als Groessenordnung, nicht als abrechenbare Wahrheit.

## Fazit

Die Codebasis ist groesser als ein reines CRUD-Projekt, weil sie fachliche Game-Logik, Simulation, mehrere Persistenzpfade, Firebase-Integration und eine breite Testsuite kombiniert. Fuer eine Einzelperson ist der realistische Aufwand am ehesten im komplexen Szenario anzusetzen; Dokumentation und Reports sollten dabei separat bewertet werden.
`;
}

function main() {
  const files = walkDirectory(projectRoot)
    .map((absolutePath) => {
      const rel = relativePath(absolutePath);
      const content = fs.readFileSync(absolutePath, "utf8");
      const { lines, nonEmptyLines } = countLines(content);

      return {
        path: rel,
        extension: extensionLabel(rel),
        category: classify(rel),
        lines,
        nonEmptyLines,
        characters: content.length,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const totals = sumWhere(files, () => true);
  const productiveCode = sumWhere(files, (file) => estimationCategories.has(file.category));
  const tests = sumWhere(files, (file) => file.category === "Test-Code");
  const documentation = sumWhere(files, (file) => file.category === "Dokumentation");
  const config = sumWhere(files, (file) => file.category === "Config");
  const codeOnly = sumWhere(files, (file) => sourceCodeExtensions.has(file.extension));
  const productiveLines = productiveCode.nonEmptyLines;

  const analysis = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    scope: {
      includedExtensions: [...includedExtensions].sort(),
      includedExactFilenames: [...includedExactFilenames].sort(),
      productiveEstimationCategories: [...estimationCategories].sort(),
    },
    exclusions: {
      directories: [...excludedDirectoryNames].sort(),
      files: [...excludedExactRelativePaths].sort(),
      pathPrefixes: [...excludedPathPrefixes].sort(),
    },
    totals,
    codeOnly,
    productiveCode,
    tests,
    documentation,
    config,
    byExtension: groupBy(files, "extension"),
    byCategory: groupBy(files, "category"),
    topByLines: files.toSorted((left, right) => right.lines - left.lines).slice(0, 20),
    topByCharacters: files.toSorted((left, right) => right.characters - left.characters).slice(0, 20),
    estimates: {
      basis: "productive non-empty lines in App-Code, Script, Schema/DB and Sonstiges",
      productiveNonEmptyLines: productiveLines,
      fast: hoursRange(productiveLines, 80, 140),
      normal: hoursRange(productiveLines, 40, 80),
      complex: hoursRange(productiveLines, 15, 40),
    },
    files,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownOutputPath, createMarkdown(analysis), "utf8");

  console.log(`Wrote ${relativePath(markdownOutputPath)}`);
  console.log(`Wrote ${relativePath(jsonOutputPath)}`);
  console.log(`Analyzed ${analysis.totals.files} files and ${analysis.totals.lines} lines.`);
}

main();
