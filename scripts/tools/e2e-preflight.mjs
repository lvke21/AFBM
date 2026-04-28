import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const HOST = "127.0.0.1";
const PORT = Number(process.env.E2E_PORT ?? 3100);
const REUSE_SERVER = process.env.E2E_REUSE_SERVER === "true";
const DEFAULT_POSTGRES_PORT = 5432;
const SOCKET_TIMEOUT_MS = 1_500;
const REUSE_SERVER_AUTH_TIMEOUT_MS = 10_000;

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .reduce((values, line) => {
      const separator = line.indexOf("=");

      if (separator === -1) {
        return values;
      }

      const key = line.slice(0, separator).trim();
      const rawValue = line.slice(separator + 1).trim();
      values[key] = rawValue.replace(/^["']|["']$/g, "");
      return values;
    }, {});
}

function loadLocalEnv() {
  return {
    ...readEnvFile(resolve(process.cwd(), ".env")),
    ...readEnvFile(resolve(process.cwd(), ".env.local")),
    ...process.env,
  };
}

function isPortOpen(port) {
  return new Promise((resolvePort) => {
    const socket = connect({ host: HOST, port });

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.once("connect", () => {
      socket.destroy();
      resolvePort(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolvePort(false);
    });

    socket.once("error", () => {
      socket.destroy();
      resolvePort(false);
    });
  });
}

function parseDatabaseEndpoint(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const port = Number(url.port || DEFAULT_POSTGRES_PORT);

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      return null;
    }

    return {
      database: url.pathname.replace(/^\//, "") || "(unbekannt)",
      host: url.hostname || "localhost",
      port,
      safeUrl: `${url.protocol}//${url.username || "user"}:***@${url.hostname || "localhost"}:${port}${url.pathname}${url.search}`,
    };
  } catch {
    return null;
  }
}

function isSocketOpen(host, port) {
  return new Promise((resolveSocket) => {
    const socket = connect({ host, port });

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.once("connect", () => {
      socket.destroy();
      resolveSocket(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolveSocket(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolveSocket(false);
    });
  });
}

function expectedReuseServerLocations(port) {
  return new Set([
    `http://${HOST}:${port}/app/savegames`,
    `http://localhost:${port}/app/savegames`,
    "/app/savegames",
  ]);
}

async function assertReusableServerAuthTarget(port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REUSE_SERVER_AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `http://${HOST}:${port}/api/e2e/dev-login?callbackUrl=%2Fapp%2Fsavegames`,
      {
        redirect: "manual",
        signal: controller.signal,
      },
    );
    const location = response.headers.get("location") ?? "";

    if (![307, 308].includes(response.status) || !expectedReuseServerLocations(port).has(location)) {
      fail(
        [
          `Wiederverwendeter E2E-Server auf Port ${port} hat keinen passenden Dev-Login-Redirect.`,
          `Erwartet: /app/savegames auf Port ${port}`,
          `Erhalten: status=${response.status}, location=${location || "(leer)"}`,
          "Starte den Server mit passender E2E_PORT/AUTH_URL/NEXTAUTH_URL-Konfiguration neu.",
        ].join("\n"),
      );
    }
  } catch (error) {
    fail(
      [
        `Wiederverwendeter E2E-Server auf Port ${port} konnte nicht ueber /api/e2e/dev-login validiert werden.`,
        error instanceof Error ? error.message : String(error),
        "Starte den Server mit AUTH_DEV_ENABLED=true und E2E_AUTH_BYPASS=true neu.",
      ].join("\n"),
    );
  } finally {
    clearTimeout(timeout);
  }
}

function fail(message) {
  console.error(`\n[E2E preflight] ${message}\n`);
  process.exit(1);
}

function databaseUnavailableMessage(databaseEndpoint) {
  return [
    `Datenbank nicht erreichbar: ${databaseEndpoint.host}:${databaseEndpoint.port}`,
    `Verwendete E2E-Datenbank: ${databaseEndpoint.safeUrl}`,
    "Starte PostgreSQL oder passe DATABASE_URL an.",
    "",
    "macOS/Homebrew Beispiel:",
    "  brew services start postgresql@16",
    "  createdb afbm_manager",
    "",
    "Docker Beispiel:",
    "  npm run db:up",
    "",
    "Reset der lokalen Container-DB:",
    "  npm run db:reset",
    "",
    "Danach ausfuehren:",
    "  npm run prisma:migrate -- --name init",
    "  npm run test:e2e:seed",
  ].join("\n");
}

async function main() {
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
    fail(`Ungueltiger E2E_PORT "${process.env.E2E_PORT}". Erlaubt ist ein Port zwischen 1024 und 65535.`);
  }

  const localEnv = loadLocalEnv();

  if (!localEnv.DATABASE_URL) {
    fail(
      "DATABASE_URL fehlt. Lege sie in .env.local an oder exportiere sie, bevor E2E-Tests gestartet werden.",
    );
  }

  const databaseEndpoint = parseDatabaseEndpoint(localEnv.DATABASE_URL);

  if (!databaseEndpoint) {
    fail("DATABASE_URL ist ungueltig und kann nicht fuer den E2E-Preflight gelesen werden.");
  }

  const databaseReachable = await isSocketOpen(databaseEndpoint.host, databaseEndpoint.port);

  if (!databaseReachable) {
    fail(databaseUnavailableMessage(databaseEndpoint));
  }

  const migrationsDir = resolve(process.cwd(), "prisma", "migrations");
  const migrationsAvailable = existsSync(migrationsDir);

  const executablePath = chromium.executablePath();

  if (!existsSync(executablePath)) {
    fail(
      `Playwright Chromium fehlt (${executablePath}). Fuehre einmal "npx playwright install chromium" aus.`,
    );
  }

  const portOpen = await isPortOpen(PORT);

  if (portOpen && !REUSE_SERVER) {
    fail(
      `Port ${PORT} ist bereits belegt. Beende den laufenden Server oder nutze E2E_PORT=<freier Port>. ` +
        "E2E_REUSE_SERVER=true ist nur fuer bewusst gestartete Testserver gedacht.",
    );
  }

  if (portOpen && REUSE_SERVER) {
    await assertReusableServerAuthTarget(PORT);
  }

  console.log(
    [
      `[E2E preflight] OK - Port ${PORT}${REUSE_SERVER ? " darf wiederverwendet werden" : " ist frei"}, Chromium vorhanden.`,
      `[E2E preflight] DB erreichbar - ${databaseEndpoint.safeUrl}`,
      `[E2E preflight] Migrationen: ${migrationsAvailable ? "prisma/migrations vorhanden" : "kein prisma/migrations-Verzeichnis eingecheckt; lokale Initial-Migration muss bei frischer DB manuell laufen"}.`,
    ].join("\n"),
  );
}

await main();
