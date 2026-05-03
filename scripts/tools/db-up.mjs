import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const POSTGRES_PORT = process.env.POSTGRES_PORT ?? "5432";
const POSTGRES_DB = process.env.POSTGRES_DB ?? "afbm_manager";
const POSTGRES_USER = process.env.POSTGRES_USER ?? "postgres";
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD ?? "postgres";
const DATA_DIR = resolve(process.cwd(), ".local", "postgres16-data");
const LOG_FILE = resolve(process.cwd(), ".local", "postgres16.log");
const HOMEBREW_POSTGRES_PREFIX = "/opt/homebrew/opt/postgresql@16";
const POSTGRES_READY_TIMEOUT_MS = Number(process.env.POSTGRES_READY_TIMEOUT_MS ?? 30_000);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    ...options,
  });
}

function commandExists(command) {
  return run("sh", ["-c", `command -v ${command}`]).status === 0;
}

function postgresBin(binary) {
  return resolve(HOMEBREW_POSTGRES_PREFIX, "bin", binary);
}

function fail(message, result) {
  console.error(`[db:up] ${message}`);
  if (result?.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(1);
}

function waitForPostgresReady() {
  const deadline = Date.now() + POSTGRES_READY_TIMEOUT_MS;
  const env = {
    ...process.env,
    PGPASSWORD: POSTGRES_PASSWORD,
  };

  while (Date.now() < deadline) {
    const result = run(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "postgres",
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-p",
        "5432",
        "-U",
        POSTGRES_USER,
        "-d",
        POSTGRES_DB,
      ],
      { env },
    );

    if (result.status === 0) {
      return true;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }

  return false;
}

function dockerComposeUp() {
  const result = run("docker", ["compose", "up", "-d", "postgres"], { stdio: "inherit" });

  if (result.status !== 0) {
    return false;
  }

  if (!waitForPostgresReady()) {
    fail(
      [
        `Docker PostgreSQL wurde gestartet, wurde aber nicht innerhalb von ${POSTGRES_READY_TIMEOUT_MS}ms bereit.`,
        "Pruefe den Container mit:",
        "  docker compose ps",
        "  docker compose logs postgres",
      ].join("\n"),
    );
  }

  console.log(
    `[db:up] OK - Docker PostgreSQL laeuft auf 127.0.0.1:${POSTGRES_PORT}, Datenbank "${POSTGRES_DB}" ist bereit.`,
  );
  process.exit(0);
}

function ensureHomebrewPostgresAvailable() {
  const requiredBins = ["initdb", "pg_ctl", "createdb"];
  const missingBins = requiredBins.filter((binary) => !existsSync(postgresBin(binary)));

  if (missingBins.length > 0) {
    fail(
      `Docker fehlt und Homebrew PostgreSQL 16 ist unvollstaendig. Fehlende Binaries: ${missingBins.join(", ")}`,
    );
  }
}

function initDataDir() {
  if (existsSync(resolve(DATA_DIR, "PG_VERSION"))) {
    return;
  }

  mkdirSync(dirname(DATA_DIR), { recursive: true });
  const result = run(postgresBin("initdb"), [
    "--auth=trust",
    "--encoding=UTF8",
    "--locale=C",
    "--username",
    POSTGRES_USER,
    DATA_DIR,
  ]);

  if (result.status !== 0) {
    fail(`Konnte lokale PostgreSQL-Datenbank nicht initialisieren: ${DATA_DIR}`, result);
  }
}

function startPostgres() {
  mkdirSync(dirname(LOG_FILE), { recursive: true });
  const result = run(postgresBin("pg_ctl"), [
    "-D",
    DATA_DIR,
    "-l",
    LOG_FILE,
    "-o",
    `-p ${POSTGRES_PORT} -c listen_addresses=127.0.0.1`,
    "start",
    "-w",
  ]);

  if (result.status !== 0 && !result.stderr.includes("another server might be running")) {
    fail(`Konnte lokale PostgreSQL-Instanz nicht starten. Log: ${LOG_FILE}`, result);
  }
}

function ensureDatabase() {
  const result = run(postgresBin("createdb"), [
    "-h",
    "127.0.0.1",
    "-p",
    POSTGRES_PORT,
    "-U",
    POSTGRES_USER,
    POSTGRES_DB,
  ]);

  if (result.status !== 0 && !result.stderr.includes("already exists")) {
    fail(`Konnte Datenbank "${POSTGRES_DB}" nicht anlegen.`, result);
  }
}

if (commandExists("docker") && dockerComposeUp()) {
  process.exit(0);
}

ensureHomebrewPostgresAvailable();
initDataDir();
startPostgres();
ensureDatabase();

console.log(
  `[db:up] OK - PostgreSQL laeuft auf 127.0.0.1:${POSTGRES_PORT}, Datenbank "${POSTGRES_DB}" ist vorhanden.`,
);
