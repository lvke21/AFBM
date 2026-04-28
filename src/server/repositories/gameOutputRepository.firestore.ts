import type { WriteBatch } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { measureAsyncPerformance } from "@/lib/observability/performance";
import { MatchStatus } from "@/modules/shared/domain/enums";
import type {
  MatchDriveResult,
  MatchSimulationResult,
  SimulationMatchContext,
} from "@/modules/seasons/application/simulation/simulation.types";

import { assertFirestoreEmulatorOnly } from "./firestoreGuard";
import { recordFirestoreUsage } from "./firestoreUsageLogger";

export type FirestoreGameOutputSummary = {
  awayScore: number;
  driveCount: number;
  finalScoreLabel: string;
  homeScore: number;
  summary: string;
  totalDrivesPlanned: number;
};

export type PersistFirestoreGameOutputInput = {
  context: SimulationMatchContext;
  result: MatchSimulationResult;
};

type FirestoreMatchOutputDoc = {
  id: string;
  leagueId: string;
  seasonId: string;
  weekId?: string;
  weekNumber?: number;
};

export const gameOutputRepositoryFirestore = {
  async persistMatchOutput(input: PersistFirestoreGameOutputInput) {
    return measureAsyncPerformance(
      {
        area: "firestore",
        metadata: {
          batchWritesPlanned: input.result.drives.length + 1,
          driveCount: input.result.drives.length,
          operationScope: "game-output",
        },
        operation: "persist-match-output",
        resultMetadata: (result) => ({
          driveEventsWritten: result.driveEventsWritten,
        }),
      },
      async () => {
        assertFirestoreEmulatorOnly();

        const firestore = getFirebaseAdminFirestore();
        const matchRef = firestore.collection("matches").doc(input.context.matchId);
        const matchSnapshot = await matchRef.get();
        recordFirestoreUsage({
          collection: "matches",
          count: matchSnapshot.exists ? 1 : 0,
          operation: "read",
          query: "doc",
        });

        if (!matchSnapshot.exists) {
          throw new Error(`Firestore match ${input.context.matchId} not found`);
        }

        const match = {
          ...(matchSnapshot.data() as FirestoreMatchOutputDoc),
          id: matchSnapshot.id,
        };

        if (
          match.leagueId !== input.context.saveGameId ||
          match.seasonId !== input.context.seasonId
        ) {
          throw new Error("Firestore match does not belong to the simulation context");
        }

        const now = new Date();
        const summary = buildGameOutputSummary(input.result, input.context);
        const batch = firestore.batch();

        batch.set(matchRef, {
          awayScore: input.result.awayScore,
          gameOutputPersistedAt: now,
          homeScore: input.result.homeScore,
          resultSummary: summary,
          simulationCompletedAt: now,
          simulationSeed: input.result.simulationSeed,
          status: MatchStatus.COMPLETED,
          updatedAt: now,
        }, { merge: true });

        await replaceDriveEvents(batch, {
          drives: input.result.drives,
          leagueId: input.context.saveGameId,
          matchId: input.context.matchId,
          seasonId: input.context.seasonId,
          weekId: match.weekId ?? `${input.context.saveGameId}_${input.context.seasonId}_w${input.context.week}`,
          weekNumber: match.weekNumber ?? input.context.week,
          writtenAt: now,
        });

        await batch.commit();
        recordFirestoreUsage({
          collection: "matches",
          count: 1,
          operation: "write",
          query: "batch set match output",
        });
        recordFirestoreUsage({
          collection: "gameEvents",
          count: input.result.drives.length,
          operation: "write",
          query: "batch set drives",
        });

        return {
          driveEventsWritten: input.result.drives.length,
          matchId: input.context.matchId,
          summary,
        };
      },
    );
  },
};

function buildGameOutputSummary(
  result: MatchSimulationResult,
  context: SimulationMatchContext,
): FirestoreGameOutputSummary {
  const homeName = `${context.homeTeam.city} ${context.homeTeam.nickname}`;
  const awayName = `${context.awayTeam.city} ${context.awayTeam.nickname}`;
  const winner = result.homeScore === result.awayScore
    ? "Unentschieden"
    : result.homeScore > result.awayScore
      ? homeName
      : awayName;
  const finalScoreLabel = `${homeName} ${result.homeScore} - ${result.awayScore} ${awayName}`;

  return {
    awayScore: result.awayScore,
    driveCount: result.drives.length,
    finalScoreLabel,
    homeScore: result.homeScore,
    summary: result.homeScore === result.awayScore
      ? `${finalScoreLabel}; ${winner} nach ${result.drives.length} Drives.`
      : `${finalScoreLabel}; Sieger: ${winner}.`,
    totalDrivesPlanned: result.totalDrivesPlanned,
  };
}

async function replaceDriveEvents(
  batch: WriteBatch,
  input: {
    drives: MatchDriveResult[];
    leagueId: string;
    matchId: string;
    seasonId: string;
    weekId: string;
    weekNumber: number;
    writtenAt: Date;
  },
) {
  const firestore = getFirebaseAdminFirestore();
  const existingEvents = await firestore
    .collection("gameEvents")
    .where("leagueId", "==", input.leagueId)
    .where("matchId", "==", input.matchId)
    .where("eventType", "==", "MATCH_DRIVE")
    .get();
  recordFirestoreUsage({
    collection: "gameEvents",
    count: existingEvents.size,
    operation: "read",
    query: "leagueId+matchId+eventType",
  });

  for (const document of existingEvents.docs) {
    batch.delete(document.ref);
  }
  recordFirestoreUsage({
    collection: "gameEvents",
    count: existingEvents.size,
    operation: "delete",
    query: "batch delete existing drives",
  });

  for (const drive of input.drives) {
    batch.set(
      firestore.collection("gameEvents").doc(makeDriveEventId(input.matchId, drive.sequence)),
      {
        ...drive,
        createdAt: input.writtenAt,
        eventType: "MATCH_DRIVE",
        id: makeDriveEventId(input.matchId, drive.sequence),
        leagueId: input.leagueId,
        matchId: input.matchId,
        seasonId: input.seasonId,
        updatedAt: input.writtenAt,
        weekId: input.weekId,
        weekNumber: input.weekNumber,
      },
    );
  }
}

function makeDriveEventId(matchId: string, sequence: number) {
  return `${matchId}_drive_${String(sequence).padStart(3, "0")}`;
}
