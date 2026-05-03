import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([
  ".git",
  ".local",
  ".next",
  "coverage",
  "firebase-emulator-data",
  "node_modules",
  "playwright-report",
  "reports-output",
  "test-results",
]);
const EXCLUDED_EXTENSIONS = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".lock",
  ".map",
  ".png",
  ".svg",
  ".tsbuildinfo",
  ".webp",
]);

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(absolutePath, output);
      continue;
    }

    if (EXCLUDED_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    output.push(absolutePath);
  }

  return output;
}

function isTextBuffer(buffer) {
  return !buffer.includes(0);
}

function categorize(file) {
  if (file.includes("/components/") || file.endsWith(".tsx")) {
    return "ui";
  }

  if (file.includes("/lib/") || file.includes("/server/") || file.includes("/modules/")) {
    return "logic";
  }

  if (file.includes("/app/")) {
    return "route";
  }

  if (file.includes("/scripts/")) {
    return "script";
  }

  if (file.includes("/e2e/")) {
    return "e2e";
  }

  if (file.includes("/docs/")) {
    return "docs";
  }

  return "other";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const files = walk(ROOT)
  .map((file) => path.relative(ROOT, file))
  .filter(
    (file) =>
      !file.startsWith("dist/") &&
      !file.startsWith("build/") &&
      !file.startsWith("docs/reports/full-project-analysis/") &&
      file !== "package-lock.json",
  );

const textFiles = [];

for (const relativePath of files) {
  const absolutePath = path.join(ROOT, relativePath);
  const buffer = fs.readFileSync(absolutePath);

  if (!isTextBuffer(buffer)) {
    continue;
  }

  const content = buffer.toString("utf8");

  textFiles.push({
    bytes: buffer.length,
    category: categorize(relativePath),
    content,
    file: relativePath,
    lines: content.split(/\r?\n/).length,
  });
}

const todos = [];
const consoles = [];
const imports = [];
const exports = [];

for (const textFile of textFiles) {
  const lines = textFile.content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/TODO|FIXME|HACK|XXX/.test(line)) {
      todos.push({
        file: textFile.file,
        line: index + 1,
        text: line.trim().slice(0, 180),
      });
    }

    if (/\bconsole\.(log|debug|warn|error|info)\b/.test(line)) {
      consoles.push({
        file: textFile.file,
        line: index + 1,
        text: line.trim().slice(0, 180),
      });
    }
  });

  const importMatches = textFile.content.matchAll(
    /(?:import[\s\S]*?from\s+|import\s*\()\s*["']([^"']+)["']/g,
  );
  let importCount = 0;

  for (const match of importMatches) {
    importCount += 1;
    imports.push({
      file: textFile.file,
      source: match[1],
    });
  }

  textFile.importCount = importCount;

  const exportMatches = textFile.content.matchAll(
    /export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g,
  );

  for (const match of exportMatches) {
    exports.push({
      file: textFile.file,
      name: match[1],
    });
  }
}

const categorySummary = {};

for (const textFile of textFiles) {
  categorySummary[textFile.category] ??= {
    files: 0,
    lines: 0,
  };
  categorySummary[textFile.category].files += 1;
  categorySummary[textFile.category].lines += textFile.lines;
}

const dependents = {};

for (const importEntry of imports) {
  if (!importEntry.source.startsWith("@/")) {
    continue;
  }

  const source = importEntry.source.replace("@/", "src/");

  dependents[source] ??= new Set();
  dependents[source].add(importEntry.file);
}

const dependentSummary = Object.entries(dependents)
  .map(([source, filesSet]) => ({
    dependents: filesSet.size,
    source,
  }))
  .sort((left, right) => right.dependents - left.dependents || left.source.localeCompare(right.source));

const longFunctions = [];

for (const textFile of textFiles.filter((file) => /\.(cjs|js|jsx|mjs|ts|tsx)$/.test(file.file))) {
  const lines = textFile.content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const declaration = lines[index].match(
      /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(|(?:const|let)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    );

    if (!declaration) {
      continue;
    }

    let braceDepth = 0;
    let started = false;
    let endIndex = index;

    for (let cursor = index; cursor < lines.length; cursor += 1) {
      for (const character of lines[cursor]) {
        if (character === "{") {
          braceDepth += 1;
          started = true;
        } else if (character === "}") {
          braceDepth -= 1;
        }
      }

      if (started && braceDepth <= 0) {
        endIndex = cursor;
        break;
      }
    }

    const length = endIndex - index + 1;

    if (length >= 80) {
      longFunctions.push({
        file: textFile.file,
        line: index + 1,
        lines: length,
        name: declaration[1] || declaration[2] || "(anonymous)",
      });
    }
  }
}

const duplicateBlocks = new Map();

for (const textFile of textFiles.filter(
  (file) => file.file.startsWith("src/") && /\.(ts|tsx)$/.test(file.file),
)) {
  const normalizedLines = textFile.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("*"));

  for (let index = 0; index <= normalizedLines.length - 8; index += 1) {
    const block = normalizedLines
      .slice(index, index + 8)
      .join("\n")
      .replace(/[A-Za-z0-9_]{16,}/g, "ID")
      .replace(/["'][^"']{12,}["']/g, "STR");

    if (block.length < 160) {
      continue;
    }

    const locations = duplicateBlocks.get(block) ?? [];

    locations.push({
      file: textFile.file,
      line: index + 1,
    });
    duplicateBlocks.set(block, locations);
  }
}

const duplicateCandidates = [...duplicateBlocks.entries()]
  .map(([block, locations]) => ({
    count: locations.length,
    files: new Set(locations.map((location) => location.file)).size,
    locations: locations.slice(0, 8),
    sample: block.slice(0, 320),
  }))
  .filter((candidate) => candidate.files > 1)
  .sort((left, right) => right.count - left.count || right.files - left.files);

const unusedExports = [];

for (const exportEntry of exports) {
  const namePattern = new RegExp(`\\b${escapeRegExp(exportEntry.name)}\\b`, "g");
  let externalReferences = 0;

  for (const textFile of textFiles) {
    if (textFile.file === exportEntry.file) {
      continue;
    }

    externalReferences += textFile.content.match(namePattern)?.length ?? 0;
  }

  if (externalReferences === 0 && !exportEntry.name.endsWith("Props")) {
    unusedExports.push({
      ...exportEntry,
      externalReferences,
    });
  }
}

const result = {
  summary: {
    categories: categorySummary,
    files: textFiles.length,
    totalLines: textFiles.reduce((sum, file) => sum + file.lines, 0),
  },
  consoleCount: consoles.length,
  consoles: consoles.slice(0, 160),
  dependentSummary: dependentSummary.slice(0, 40),
  duplicateCandidates: duplicateCandidates.slice(0, 40),
  largestByBytes: [...textFiles].sort((left, right) => right.bytes - left.bytes).slice(0, 40),
  largestByLines: [...textFiles].sort((left, right) => right.lines - left.lines).slice(0, 40),
  longFunctions: longFunctions.sort((left, right) => right.lines - left.lines).slice(0, 80),
  mostImports: [...textFiles]
    .sort((left, right) => right.importCount - left.importCount)
    .slice(0, 40)
    .map((file) => ({
      file: file.file,
      imports: file.importCount,
      lines: file.lines,
    })),
  todoCount: todos.length,
  todos: todos.slice(0, 120),
  unusedExportCandidates: unusedExports.slice(0, 120),
  unusedExportCount: unusedExports.length,
};

if (process.argv.includes("--compact")) {
  console.log(
    JSON.stringify(
      {
        summary: result.summary,
        consoleCount: result.consoleCount,
        consoleFiles: Object.entries(
          consoles.reduce((filesByConsoleCount, entry) => {
            filesByConsoleCount[entry.file] = (filesByConsoleCount[entry.file] ?? 0) + 1;
            return filesByConsoleCount;
          }, {}),
        )
          .map(([file, count]) => ({ count, file }))
          .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file))
          .slice(0, 30),
        dependentSummary: result.dependentSummary.slice(0, 25),
        duplicateCandidates: result.duplicateCandidates.slice(0, 20).map((candidate) => ({
          ...candidate,
          sample: candidate.sample.slice(0, 180),
        })),
        largestByLines: result.largestByLines.slice(0, 30).map(({ bytes, category, file, lines }) => ({
          bytes,
          category,
          file,
          lines,
        })),
        longFunctions: result.longFunctions.slice(0, 40),
        mostImports: result.mostImports.slice(0, 25),
        todoCount: result.todoCount,
        todoFiles: Object.entries(
          todos.reduce((filesByTodoCount, entry) => {
            filesByTodoCount[entry.file] = (filesByTodoCount[entry.file] ?? 0) + 1;
            return filesByTodoCount;
          }, {}),
        )
          .map(([file, count]) => ({ count, file }))
          .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file))
          .slice(0, 30),
        unusedExportCandidates: result.unusedExportCandidates.slice(0, 80),
        unusedExportCount: result.unusedExportCount,
      },
      null,
      2,
    ),
  );
} else {
  console.log(JSON.stringify(result, null, 2));
}
