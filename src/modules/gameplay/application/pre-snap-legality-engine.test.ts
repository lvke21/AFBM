import { describe, expect, it } from "vitest";

import type { CompetitionRuleset } from "../domain/competition-rules";
import type { GameSituationSnapshot } from "../domain/game-situation";
import type { PlayCallDefinition } from "../domain/play-library";
import type { LegalityIssueCode } from "../domain/pre-snap-legality";
import type {
  FieldAlignment,
  FormationSnapshot,
  MotionSnapshot,
  PersonnelPackage,
  PlayerAlignmentSnapshot,
  PreSnapStructureSnapshot,
  SnapPlayerRole,
} from "../domain/pre-snap-structure";
import { PLAY_LIBRARY_CATALOG } from "../infrastructure/play-library";
import { buildPreSnapStructureForPlay } from "./play-library-service";
import {
  resolveReceiverEligibilityMap,
  validateIneligibleDownfield,
  validatePreSnapStructure,
} from "./pre-snap-legality-engine";

function createSituation(
  ruleset: CompetitionRuleset,
  overrides: Partial<GameSituationSnapshot> = {},
): GameSituationSnapshot {
  return {
    ruleset,
    hashMarkProfile: ruleset === "COLLEGE" ? "COLLEGE_HASH" : "NFL_HASH",
    quarter: 1,
    down: 1,
    yardsToGo: 10,
    ballOnYardLine: 35,
    distanceBucket: "MEDIUM",
    fieldZone: "MIDFIELD",
    clockBucket: "EARLY",
    scoreBucket: "TIED",
    offenseScore: 0,
    defenseScore: 0,
    secondsRemainingInQuarter: 780,
    secondsRemainingInGame: 3480,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    tempoProfile: "NORMAL",
    possessionTeamId: "offense",
    defenseTeamId: "defense",
    ...overrides,
  };
}

function createPersonnelPackage(
  side: "OFFENSE" | "DEFENSE",
  label: string,
  entries: PersonnelPackage["entries"],
): PersonnelPackage {
  return {
    id: `${side}-${label}`,
    side,
    label,
    entries,
    totalPlayers: entries.reduce((total, entry) => total + entry.quantity, 0),
  };
}

function createFormation(): FormationSnapshot {
  return {
    id: "gun-trips",
    familyId: "shotgun-spread",
    side: "OFFENSE",
    label: "Gun Trips Tight",
    strength: "RIGHT",
    spacing: "NORMAL",
    tags: ["SHOTGUN", "TRIPS"],
  };
}

function createMotion(overrides: Partial<MotionSnapshot> = {}): MotionSnapshot {
  return {
    type: "NONE",
    isInMotionAtSnap: false,
    directionAtSnap: "STATIONARY",
    startedFromSetPosition: true,
    ...overrides,
  };
}

function createOffensePlayer(input: {
  playerId: string;
  positionCode: string;
  alignmentIndex: number;
  onLineOfScrimmage: boolean;
  inBackfield: boolean;
  snapRole: SnapPlayerRole;
  fieldAlignment: FieldAlignment;
  receiverDeclaration?: PlayerAlignmentSnapshot["receiverDeclaration"];
  motion?: Partial<MotionSnapshot>;
}): PlayerAlignmentSnapshot {
  return {
    playerId: input.playerId,
    teamId: "offense",
    positionCode: input.positionCode,
    lineOfScrimmageSide:
      input.alignmentIndex < 3 ? "LEFT" : input.alignmentIndex > 3 ? "RIGHT" : "MIDDLE",
    fieldAlignment: input.fieldAlignment,
    alignmentIndex: input.alignmentIndex,
    onLineOfScrimmage: input.onLineOfScrimmage,
    inBackfield: input.inBackfield,
    snapRole: input.snapRole,
    receiverDeclaration: input.receiverDeclaration ?? "AUTO",
    motion: createMotion(input.motion),
  };
}

function createDefensePlayer(playerId: string, alignmentIndex: number): PlayerAlignmentSnapshot {
  const positionCode =
    alignmentIndex === 0
      ? "LE"
      : alignmentIndex === 1 || alignmentIndex === 2
        ? "DT"
        : alignmentIndex === 3
          ? "RE"
          : alignmentIndex === 4
            ? "MLB"
            : alignmentIndex === 5
              ? "ROLB"
              : alignmentIndex < 9
                ? "CB"
                : alignmentIndex === 9
                  ? "FS"
                  : "SS";
  const snapRole =
    alignmentIndex < 4
      ? ("DEFENSIVE_FRONT" as const)
      : alignmentIndex < 6
        ? ("DEFENSIVE_BOX" as const)
        : ("DEFENSIVE_SECONDARY" as const);

  return {
    playerId,
    teamId: "defense",
    positionCode,
    lineOfScrimmageSide:
      alignmentIndex < 3 ? "LEFT" : alignmentIndex > 3 ? "RIGHT" : "MIDDLE",
    fieldAlignment: "CORE",
    alignmentIndex,
    onLineOfScrimmage: false,
    inBackfield: true,
    snapRole,
    receiverDeclaration: "INELIGIBLE",
    motion: createMotion(),
  };
}

function createBaseSnapshot(ruleset: CompetitionRuleset = "NFL_PRO"): PreSnapStructureSnapshot {
  return {
    ruleset,
    situation: createSituation(ruleset),
    offensePersonnel: createPersonnelPackage("OFFENSE", "11", [
      { positionCode: "QB", quantity: 1 },
      { positionCode: "RB", quantity: 1 },
      { positionCode: "WR", quantity: 3 },
      { positionCode: "TE", quantity: 1 },
      { positionCode: "OL", quantity: 5 },
    ]),
    defensePersonnel: createPersonnelPackage("DEFENSE", "Nickel", [
      { positionCode: "DL", quantity: 4 },
      { positionCode: "LB", quantity: 2 },
      { positionCode: "DB", quantity: 5 },
    ]),
    formation: createFormation(),
    offenseShift: {
      playersShifted: [],
      allPlayersSetForSeconds: 1,
      wasResetAfterShift: true,
    },
    offensePlayers: [
      createOffensePlayer({
        playerId: "wr-left",
        positionCode: "WR",
        alignmentIndex: 0,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "LINE_END",
        fieldAlignment: "WIDE",
      }),
      createOffensePlayer({
        playerId: "lt",
        positionCode: "LT",
        alignmentIndex: 1,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "INTERIOR_LINE",
        fieldAlignment: "CORE",
      }),
      createOffensePlayer({
        playerId: "lg",
        positionCode: "LG",
        alignmentIndex: 2,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "INTERIOR_LINE",
        fieldAlignment: "CORE",
      }),
      createOffensePlayer({
        playerId: "c",
        positionCode: "C",
        alignmentIndex: 3,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "INTERIOR_LINE",
        fieldAlignment: "CORE",
      }),
      createOffensePlayer({
        playerId: "rg",
        positionCode: "RG",
        alignmentIndex: 4,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "INTERIOR_LINE",
        fieldAlignment: "CORE",
      }),
      createOffensePlayer({
        playerId: "rt",
        positionCode: "RT",
        alignmentIndex: 5,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "INTERIOR_LINE",
        fieldAlignment: "CORE",
      }),
      createOffensePlayer({
        playerId: "te-right",
        positionCode: "TE",
        alignmentIndex: 6,
        onLineOfScrimmage: true,
        inBackfield: false,
        snapRole: "LINE_END",
        fieldAlignment: "CORE",
      }),
      createOffensePlayer({
        playerId: "slot-left",
        positionCode: "WR",
        alignmentIndex: 1,
        onLineOfScrimmage: false,
        inBackfield: true,
        snapRole: "BACKFIELD_SKILL",
        fieldAlignment: "SLOT",
      }),
      createOffensePlayer({
        playerId: "qb",
        positionCode: "QB",
        alignmentIndex: 3,
        onLineOfScrimmage: false,
        inBackfield: true,
        snapRole: "BACKFIELD_QB",
        fieldAlignment: "BACKFIELD",
      }),
      createOffensePlayer({
        playerId: "rb",
        positionCode: "RB",
        alignmentIndex: 4,
        onLineOfScrimmage: false,
        inBackfield: true,
        snapRole: "BACKFIELD_SKILL",
        fieldAlignment: "BACKFIELD",
      }),
      createOffensePlayer({
        playerId: "slot-right",
        positionCode: "WR",
        alignmentIndex: 5,
        onLineOfScrimmage: false,
        inBackfield: true,
        snapRole: "BACKFIELD_SKILL",
        fieldAlignment: "SLOT",
      }),
    ],
    defensePlayers: Array.from({ length: 11 }, (_, index) =>
      createDefensePlayer(`def-${index + 1}`, index),
    ),
  };
}

function listCatalogPlays(): PlayCallDefinition[] {
  return [
    ...PLAY_LIBRARY_CATALOG.offensePlays,
    ...PLAY_LIBRARY_CATALOG.defensePlays,
  ];
}

function requireCatalogPlay(playId: string): PlayCallDefinition {
  const play = listCatalogPlays().find((entry) => entry.id === playId);

  if (!play) {
    throw new Error(`Missing play ${playId} in catalog`);
  }

  return play;
}

function issueCodes(snapshot: PreSnapStructureSnapshot): LegalityIssueCode[] {
  return validatePreSnapStructure(snapshot).issues.map((issue) => issue.code);
}

describe("pre-snap legality engine", () => {
  it("accepts a legal standard formation and resolves receiver eligibility", () => {
    const snapshot = createBaseSnapshot("NFL_PRO");
    const result = validatePreSnapStructure(snapshot);
    const eligibilityMap = resolveReceiverEligibilityMap(snapshot);

    expect(result.isLegal).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(eligibilityMap.get("wr-left")).toBe("ELIGIBLE");
    expect(eligibilityMap.get("te-right")).toBe("ELIGIBLE");
    expect(eligibilityMap.get("qb")).toBe("INELIGIBLE");
  });

  it("rejects a formation with an illegal line-of-scrimmage distribution", () => {
    const snapshot = createBaseSnapshot("NFL_PRO");
    const te = snapshot.offensePlayers.find((player) => player.playerId === "te-right");

    if (!te) {
      throw new Error("Expected tight end in base snapshot");
    }

    te.onLineOfScrimmage = false;
    te.inBackfield = true;
    te.snapRole = "BACKFIELD_SKILL";
    te.fieldAlignment = "BACKFIELD";

    const result = validatePreSnapStructure(snapshot);

    expect(result.isLegal).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("OFFENSE_TOO_FEW_ON_LINE");
  });

  it("rejects illegal motion toward the line at the snap", () => {
    const snapshot = createBaseSnapshot("NFL_PRO");
    const motionPlayer = snapshot.offensePlayers.find(
      (player) => player.playerId === "slot-left",
    );

    if (!motionPlayer) {
      throw new Error("Expected slot-left in base snapshot");
    }

    motionPlayer.motion = createMotion({
      type: "JET",
      isInMotionAtSnap: true,
      directionAtSnap: "TOWARD_LINE",
      startedFromSetPosition: true,
    });

    const result = validatePreSnapStructure(snapshot);

    expect(result.isLegal).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "ILLEGAL_MOTION_DIRECTION",
    );
  });

  it("rejects invalid eligible receiver ordering across the offensive line", () => {
    const snapshot = createBaseSnapshot("NFL_PRO");
    const leftEnd = snapshot.offensePlayers.find((player) => player.playerId === "wr-left");
    const interior = snapshot.offensePlayers.find((player) => player.playerId === "lt");

    if (!leftEnd || !interior) {
      throw new Error("Expected left end and interior lineman");
    }

    leftEnd.receiverDeclaration = "INELIGIBLE";
    interior.receiverDeclaration = "ELIGIBLE";

    const result = validatePreSnapStructure(snapshot);
    const codes = result.issues.map((issue) => issue.code);

    expect(result.isLegal).toBe(false);
    expect(codes).toContain("LINE_END_INELIGIBLE");
    expect(codes).toContain("INTERIOR_PLAYER_ELIGIBLE");
  });

  it("applies different ineligible-downfield limits in NFL and College mode", () => {
    const nflResult = validatePreSnapStructure(createBaseSnapshot("NFL_PRO"));
    const collegeResult = validatePreSnapStructure(createBaseSnapshot("COLLEGE"));

    const nflDownfield = validateIneligibleDownfield({
      normalizedSnapshot: nflResult.normalizedSnapshot,
      isForwardPassThrown: true,
      passCrossedLineOfScrimmage: true,
      observations: [
        {
          playerId: "lt",
          yardsBeyondLineOfScrimmage: 2,
        },
      ],
    });
    const collegeDownfield = validateIneligibleDownfield({
      normalizedSnapshot: collegeResult.normalizedSnapshot,
      isForwardPassThrown: true,
      passCrossedLineOfScrimmage: true,
      observations: [
        {
          playerId: "lt",
          yardsBeyondLineOfScrimmage: 2,
        },
      ],
    });

    expect(nflDownfield.isLegal).toBe(false);
    expect(collegeDownfield.isLegal).toBe(true);
  });

  it("enforces ineligible-downfield boundary values exactly at the ruleset limit", () => {
    const nflSnapshot = validatePreSnapStructure(createBaseSnapshot("NFL_PRO"));
    const collegeSnapshot = validatePreSnapStructure(createBaseSnapshot("COLLEGE"));

    expect(
      validateIneligibleDownfield({
        normalizedSnapshot: nflSnapshot.normalizedSnapshot,
        isForwardPassThrown: true,
        passCrossedLineOfScrimmage: true,
        observations: [
          {
            playerId: "lg",
            yardsBeyondLineOfScrimmage: 1,
          },
        ],
      }).isLegal,
    ).toBe(true);

    expect(
      validateIneligibleDownfield({
        normalizedSnapshot: nflSnapshot.normalizedSnapshot,
        isForwardPassThrown: true,
        passCrossedLineOfScrimmage: true,
        observations: [
          {
            playerId: "lg",
            yardsBeyondLineOfScrimmage: 1.01,
          },
        ],
      }).isLegal,
    ).toBe(false);

    expect(
      validateIneligibleDownfield({
        normalizedSnapshot: collegeSnapshot.normalizedSnapshot,
        isForwardPassThrown: true,
        passCrossedLineOfScrimmage: true,
        observations: [
          {
            playerId: "rg",
            yardsBeyondLineOfScrimmage: 3,
          },
        ],
      }).isLegal,
    ).toBe(true);

    expect(
      validateIneligibleDownfield({
        normalizedSnapshot: collegeSnapshot.normalizedSnapshot,
        isForwardPassThrown: true,
        passCrossedLineOfScrimmage: true,
        observations: [
          {
            playerId: "rg",
            yardsBeyondLineOfScrimmage: 3.01,
          },
        ],
      }).isLegal,
    ).toBe(false);
  });

  it("enforces the shift set requirement at the one-second boundary", () => {
    const illegalSnapshot = createBaseSnapshot("NFL_PRO");
    illegalSnapshot.offenseShift = {
      playersShifted: ["slot-left", "slot-right"],
      allPlayersSetForSeconds: 0.9,
      wasResetAfterShift: true,
    };

    const legalSnapshot = createBaseSnapshot("NFL_PRO");
    legalSnapshot.offenseShift = {
      playersShifted: ["slot-left", "slot-right"],
      allPlayersSetForSeconds: 1,
      wasResetAfterShift: true,
    };

    const illegalResult = validatePreSnapStructure(illegalSnapshot);
    const legalResult = validatePreSnapStructure(legalSnapshot);

    expect(illegalResult.isLegal).toBe(false);
    expect(illegalResult.issues.map((issue) => issue.code)).toContain("SHIFT_NOT_SET");
    expect(legalResult.isLegal).toBe(true);
  });

  it("rejects isolated negative cases across the offensive structure and motion rule groups", () => {
    const cases: Array<{
      label: string;
      expectedCode: LegalityIssueCode;
      mutate: (snapshot: PreSnapStructureSnapshot) => void;
    }> = [
      {
        label: "too many offensive backfield players",
        expectedCode: "OFFENSE_TOO_MANY_BACKFIELD",
        mutate: (snapshot) => {
          const te = snapshot.offensePlayers.find(
            (player) => player.playerId === "te-right",
          );

          if (!te) {
            throw new Error("Expected tight end in base snapshot");
          }

          te.onLineOfScrimmage = false;
          te.inBackfield = true;
          te.snapRole = "BACKFIELD_SKILL";
          te.fieldAlignment = "BACKFIELD";
        },
      },
      {
        label: "too few eligible receivers",
        expectedCode: "TOO_FEW_ELIGIBLE_RECEIVERS",
        mutate: (snapshot) => {
          for (const player of snapshot.offensePlayers) {
            if (player.snapRole !== "BACKFIELD_QB") {
              player.receiverDeclaration = "INELIGIBLE";
            }
          }
        },
      },
      {
        label: "more than one player in motion",
        expectedCode: "TOO_MANY_PLAYERS_IN_MOTION",
        mutate: (snapshot) => {
          for (const playerId of ["slot-left", "slot-right"]) {
            const player = snapshot.offensePlayers.find(
              (entry) => entry.playerId === playerId,
            );

            if (!player) {
              throw new Error(`Expected ${playerId} in base snapshot`);
            }

            player.motion = createMotion({
              type: "JET",
              isInMotionAtSnap: true,
              directionAtSnap: "PARALLEL",
              startedFromSetPosition: true,
            });
          }
        },
      },
      {
        label: "motion player aligned on the line",
        expectedCode: "MOTION_PLAYER_ON_LINE",
        mutate: (snapshot) => {
          const player = snapshot.offensePlayers.find(
            (entry) => entry.playerId === "wr-left",
          );

          if (!player) {
            throw new Error("Expected wr-left in base snapshot");
          }

          player.motion = createMotion({
            type: "JET",
            isInMotionAtSnap: true,
            directionAtSnap: "PARALLEL",
            startedFromSetPosition: true,
          });
        },
      },
      {
        label: "motion not started from a set position",
        expectedCode: "MOTION_NOT_FROM_SET_POSITION",
        mutate: (snapshot) => {
          const player = snapshot.offensePlayers.find(
            (entry) => entry.playerId === "slot-left",
          );

          if (!player) {
            throw new Error("Expected slot-left in base snapshot");
          }

          player.motion = createMotion({
            type: "ORBIT",
            isInMotionAtSnap: true,
            directionAtSnap: "PARALLEL",
            startedFromSetPosition: false,
          });
        },
      },
    ];

    const failures = cases.flatMap((testCase) => {
      const snapshot = createBaseSnapshot("NFL_PRO");
      testCase.mutate(snapshot);
      const codes = issueCodes(snapshot);

      return codes.includes(testCase.expectedCode)
        ? []
        : [{ label: testCase.label, expectedCode: testCase.expectedCode, codes }];
    });

    expect(failures).toEqual([]);
  });

  it("accepts every shipped play through the legality engine across supported rulesets", () => {
    const failures = listCatalogPlays().flatMap((play) =>
      play.supportedRulesets.flatMap((ruleset) => {
        const result = validatePreSnapStructure(
          buildPreSnapStructureForPlay(play, createSituation(ruleset)),
        );

        return result.isLegal
          ? []
          : [
              {
                playId: play.id,
                ruleset,
                issues: result.issues.map((issue) => issue.code),
              },
            ];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("keeps the catalog legality matrix visible for every supported ruleset", () => {
    const rulesets = ["NFL_PRO", "COLLEGE"] as const;
    const matrix = Object.fromEntries(
      rulesets.map((ruleset) => [ruleset, { checked: 0, failures: [] as unknown[] }]),
    ) as Record<
      (typeof rulesets)[number],
      { checked: number; failures: unknown[] }
    >;

    for (const ruleset of rulesets) {
      for (const play of listCatalogPlays().filter((entry) =>
        entry.supportedRulesets.includes(ruleset),
      )) {
        matrix[ruleset].checked += 1;
        const result = validatePreSnapStructure(
          buildPreSnapStructureForPlay(play, createSituation(ruleset)),
        );

        if (!result.isLegal) {
          matrix[ruleset].failures.push({
            playId: play.id,
            issues: result.issues.map((issue) => issue.code),
          });
        }
      }
    }

    expect(matrix.NFL_PRO.checked).toBe(55);
    expect(matrix.COLLEGE.checked).toBe(55);
    expect(matrix.NFL_PRO.failures).toEqual([]);
    expect(matrix.COLLEGE.failures).toEqual([]);
  });

  it("accepts rare empty, heavy, three-high, and goal-line library structures", () => {
    const checks = [
      { playId: "off-empty-choice", ruleset: "NFL_PRO" as const },
      { playId: "off-play-action-leak-over", ruleset: "NFL_PRO" as const },
      { playId: "def-three-high-middle-poach", ruleset: "COLLEGE" as const },
      { playId: "def-red-zone-bear-cage", ruleset: "NFL_PRO" as const },
    ];
    const failures = checks.flatMap(({ playId, ruleset }) => {
      const result = validatePreSnapStructure(
        buildPreSnapStructureForPlay(requireCatalogPlay(playId), createSituation(ruleset)),
      );

      return result.isLegal
        ? []
        : [
            {
              playId,
              ruleset,
              issues: result.issues.map((issue) => issue.code),
            },
          ];
    });

    expect(failures).toEqual([]);
  });

  it("rejects offensive snapshots whose aligned players no longer match the personnel package", () => {
    const snapshot = buildPreSnapStructureForPlay(
      requireCatalogPlay("off-empty-choice"),
      createSituation("NFL_PRO"),
    );
    const receiver = snapshot.offensePlayers.find((player) => player.positionCode === "WR");

    if (!receiver) {
      throw new Error("Expected a receiver in the empty snapshot");
    }

    receiver.positionCode = "TE";

    const result = validatePreSnapStructure(snapshot);

    expect(result.isLegal).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "OFFENSE_PERSONNEL_PACKAGE_MISMATCH",
    );
  });

  it("rejects defensive snapshots whose aligned front no longer matches the personnel package", () => {
    const snapshot = buildPreSnapStructureForPlay(
      requireCatalogPlay("def-red-zone-bear-cage"),
      createSituation("NFL_PRO"),
    );
    const frontPlayer = snapshot.defensePlayers.find(
      (player) => player.snapRole === "DEFENSIVE_FRONT",
    );

    if (!frontPlayer) {
      throw new Error("Expected a defensive front player in the goal-line snapshot");
    }

    frontPlayer.positionCode = "CB";

    const result = validatePreSnapStructure(snapshot);

    expect(result.isLegal).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "DEFENSE_PERSONNEL_PACKAGE_MISMATCH",
    );
  });
});
