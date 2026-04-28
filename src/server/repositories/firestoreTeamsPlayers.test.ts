import { deleteApp, getApps } from "firebase-admin/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildFirestoreSeedDocuments,
  ensureFirestoreEmulatorEnvironment,
  seedFirestoreEmulator,
} from "../../../scripts/seeds/firestore-seed";
import { resetFirestoreEmulator } from "../../../scripts/seeds/firestore-reset";
import { getPlayerDetail } from "@/modules/players/application/player-query.service";
import { getTeamDetail } from "@/modules/teams/application/team-query.service";
import { getRepositories } from "./index";
import { playerRepositoryFirestore } from "./playerRepository.firestore";
import { teamRepositoryFirestore } from "./teamRepository.firestore";

const leagueId = "league-demo-2026";
const ownerId = "firebase-e2e-owner";
const teamId = "team-demo-arrows";
const playerId = "team-demo-arrows-qb";

async function cleanupAdminApps() {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}

describe("firestore team and player repositories", () => {
  beforeAll(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-afbm");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    ensureFirestoreEmulatorEnvironment();
  });

  beforeEach(async () => {
    await resetFirestoreEmulator();
    await seedFirestoreEmulator();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await resetFirestoreEmulator();
    await cleanupAdminApps();
  });

  it("loads a team with its roster from Firestore", async () => {
    const team = await teamRepositoryFirestore.findOwnedByUser(ownerId, leagueId, teamId);

    expect(team?.id).toBe(teamId);
    expect(team?.rosterProfiles).toHaveLength(8);
    expect(team?.rosterProfiles[0]?.player.id).toMatch(/^team-demo-arrows-/);
  });

  it("saves and reloads a team document in Firestore", async () => {
    const document = buildFirestoreSeedDocuments().find(
      (seedDocument) => seedDocument.collection === "teams" && seedDocument.id === teamId,
    );

    expect(document).toBeDefined();

    await teamRepositoryFirestore.save({
      ...(document?.data as Parameters<typeof teamRepositoryFirestore.save>[0]),
      nickname: "Arrows QA",
      overallRating: 91,
    });

    const team = await teamRepositoryFirestore.findBySaveGame(leagueId, teamId);

    expect(team?.nickname).toBe("Arrows QA");
    expect(team?.overallRating).toBe(91);
  });

  it("loads a player detail from Firestore", async () => {
    const player = await playerRepositoryFirestore.findOwnedByUser(ownerId, leagueId, playerId);

    expect(player?.id).toBe(playerId);
    expect(player?.rosterProfile?.team?.id).toBe(teamId);
    expect(player?.evaluation?.positionOverall).toBeGreaterThan(0);
    expect(player?.attributes.length).toBeGreaterThan(0);
  });

  it("loads players by team from Firestore", async () => {
    const players = await playerRepositoryFirestore.findByTeam(leagueId, teamId);

    expect(players).toHaveLength(8);
    expect(players.map((player) => player.rosterProfile?.team?.id)).toEqual(
      Array.from({ length: 8 }, () => teamId),
    );
    expect(players[0]?.playerSeasonStats.length).toBeGreaterThan(0);
  });

  it("loads league teams with rosters without per-team detail reloads", async () => {
    const teams = await teamRepositoryFirestore.listByLeague(leagueId);

    expect(teams).toHaveLength(8);
    expect(teams.map((team) => team.abbreviation)).toEqual([
      "AUS",
      "BOS",
      "CHI",
      "DEN",
      "ELP",
      "FRE",
      "GEO",
      "HOU",
    ]);
    expect(teams.every((team) => team.rosterProfiles.length === 8)).toBe(true);
  });

  it("saves and reloads a player document in Firestore", async () => {
    const document = buildFirestoreSeedDocuments().find(
      (seedDocument) => seedDocument.collection === "players" && seedDocument.id === playerId,
    );

    expect(document).toBeDefined();

    await playerRepositoryFirestore.save({
      ...(document?.data as Parameters<typeof playerRepositoryFirestore.save>[0]),
      condition: {
        fatigue: 12,
        morale: 88,
      },
    });

    const player = await playerRepositoryFirestore.findBySaveGame(leagueId, playerId);

    expect(player?.fatigue).toBe(12);
    expect(player?.morale).toBe(88);
  });

  it("returns null for missing, foreign, or unauthorized records", async () => {
    await expect(teamRepositoryFirestore.findBySaveGame(leagueId, "missing-team")).resolves.toBeNull();
    await expect(playerRepositoryFirestore.findBySaveGame(leagueId, "missing-player")).resolves.toBeNull();
    await expect(teamRepositoryFirestore.findBySaveGame("foreign-league", teamId)).resolves.toBeNull();
    await expect(
      playerRepositoryFirestore.findOwnedByUser("not-a-member", leagueId, playerId),
    ).resolves.toBeNull();
  });

  it("switches only team and player repositories when DATA_BACKEND=firestore", () => {
    vi.stubEnv("DATA_BACKEND", "firestore");

    const repositories = getRepositories();

    expect(repositories.backend).toBe("firestore");
    expect(repositories.teams).toBe(teamRepositoryFirestore);
    expect(repositories.players).toBe(playerRepositoryFirestore);
    expect(repositories.matches.findDetailForUser).toBeTypeOf("function");
  });

  it("serves the existing team query path from Firestore", async () => {
    vi.stubEnv("DATA_BACKEND", "firestore");

    const team = await getTeamDetail(leagueId, teamId);

    expect(team?.id).toBe(teamId);
    expect(team?.players).toHaveLength(8);
  });

  it("serves the existing player query path from Firestore", async () => {
    vi.stubEnv("DATA_BACKEND", "firestore");

    const player = await getPlayerDetail(leagueId, playerId);

    expect(player?.id).toBe(playerId);
    expect(player?.team?.id).toBe(teamId);
  });
});
