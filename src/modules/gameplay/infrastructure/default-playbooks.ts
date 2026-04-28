import type { CompetitionRuleset } from "../domain/competition-rules";
import type { Playbook, PlaybookPolicy, WeightedPlayReference } from "../domain/playbook";

function familyRef(referenceId: string, weight: number): WeightedPlayReference {
  return {
    referenceId,
    referenceType: "PLAY_FAMILY",
    weight,
  };
}

function policy(input: PlaybookPolicy): PlaybookPolicy {
  return input;
}

export function buildDefaultPlaybook(input: {
  teamId: string;
  ruleset: CompetitionRuleset;
  id?: string;
}): Playbook {
  return {
    id: input.id ?? `default-playbook-${input.teamId}`,
    teamId: input.teamId,
    ruleset: input.ruleset,
    offensePolicies: [
      policy({
        id: "off-base-early-down",
        side: "OFFENSE",
        label: "Base Early Down",
        situation: {
          downs: [1, 2],
          distanceBuckets: ["SHORT", "MEDIUM"],
          fieldZones: ["OWN_TERRITORY", "MIDFIELD", "PLUS_TERRITORY"],
        },
        candidates: [
          familyRef("ZONE_RUN", 1.15),
          familyRef("GAP_RUN", 0.95),
          familyRef("DESIGNED_QB_RUN", 0.28),
          familyRef("OPTION_RPO", 1.1),
          familyRef("PLAY_ACTION", 0.7),
          familyRef("MOVEMENT_PASS", 0.35),
          familyRef("QUICK_PASS", 0.6),
        ],
      }),
      policy({
        id: "off-breaker-shot-window",
        side: "OFFENSE",
        label: "2nd And Short Breakers",
        situation: {
          downs: [2],
          distanceBuckets: ["INCHES", "SHORT"],
          fieldZones: ["OWN_TERRITORY", "MIDFIELD", "PLUS_TERRITORY"],
        },
        candidates: [
          familyRef("PLAY_ACTION", 1.25),
          familyRef("MOVEMENT_PASS", 0.95),
          familyRef("DROPBACK", 1.05),
          familyRef("OPTION_RPO", 0.85),
          familyRef("GAP_RUN", 0.75),
        ],
      }),
      policy({
        id: "off-passing-down",
        side: "OFFENSE",
        label: "Passing Down Menu",
        situation: {
          downs: [2, 3, 4],
          distanceBuckets: ["MEDIUM", "LONG", "VERY_LONG"],
        },
        candidates: [
          familyRef("QUICK_PASS", 1.2),
          familyRef("DROPBACK", 1.15),
          familyRef("MOVEMENT_PASS", 0.8),
          familyRef("EMPTY_TEMPO", 0.75),
          familyRef("SCREEN", 0.9),
          familyRef("OPTION_RPO", 0.55),
          familyRef("PLAY_ACTION", 0.45),
        ],
      }),
      policy({
        id: "off-short-yardage",
        side: "OFFENSE",
        label: "Short Yardage",
        situation: {
          downs: [3, 4],
          distanceBuckets: ["INCHES", "SHORT"],
          fieldZones: ["OWN_TERRITORY", "MIDFIELD", "PLUS_TERRITORY", "HIGH_RED_ZONE", "LOW_RED_ZONE", "GOAL_TO_GO"],
        },
        candidates: [
          familyRef("GAP_RUN", 1.2),
          familyRef("ZONE_RUN", 0.95),
          familyRef("DESIGNED_QB_RUN", 0.85),
          familyRef("OPTION_RPO", 0.75),
          familyRef("QUICK_PASS", 0.7),
        ],
      }),
      policy({
        id: "off-red-zone",
        side: "OFFENSE",
        label: "Red Zone",
        situation: {
          fieldZones: ["HIGH_RED_ZONE", "LOW_RED_ZONE", "GOAL_TO_GO"],
        },
        candidates: [
          familyRef("GAP_RUN", 1.0),
          familyRef("QUICK_PASS", 1.0),
          familyRef("PLAY_ACTION", 0.95),
          familyRef("DESIGNED_QB_RUN", 0.8),
          familyRef("MOVEMENT_PASS", 0.65),
          familyRef("ZONE_RUN", 0.8),
          familyRef("OPTION_RPO", 0.55),
          familyRef("SCREEN", 0.4),
        ],
      }),
      policy({
        id: "off-two-minute",
        side: "OFFENSE",
        label: "Two Minute",
        situation: {
          clockBuckets: ["TWO_MINUTE", "ENDGAME"],
        },
        candidates: [
          familyRef("QUICK_PASS", 1.5),
          familyRef("DROPBACK", 1.35),
          familyRef("EMPTY_TEMPO", 1.05),
          familyRef("MOVEMENT_PASS", 0.55),
          familyRef("SCREEN", 0.9),
          familyRef("OPTION_RPO", 0.28),
        ],
      }),
      policy({
        id: "off-backed-up",
        side: "OFFENSE",
        label: "Backed Up",
        situation: {
          fieldZones: ["BACKED_UP"],
        },
        candidates: [
          familyRef("ZONE_RUN", 1.0),
          familyRef("QUICK_PASS", 0.9),
          familyRef("GAP_RUN", 0.7),
          familyRef("MOVEMENT_PASS", 0.25),
          familyRef("SCREEN", 0.5),
          familyRef("PLAY_ACTION", 0.35),
        ],
      }),
    ],
    defensePolicies: [
      policy({
        id: "def-base-early-down",
        side: "DEFENSE",
        label: "Base Early Down",
        situation: {
          downs: [1, 2],
          distanceBuckets: ["SHORT", "MEDIUM"],
          fieldZones: ["BACKED_UP", "OWN_TERRITORY", "MIDFIELD", "PLUS_TERRITORY"],
        },
        candidates: [
          familyRef("MATCH_COVERAGE", 1.0),
          familyRef("ZONE_COVERAGE", 0.95),
          familyRef("THREE_HIGH_PACKAGE", 0.35),
          familyRef("RUN_BLITZ", 0.28),
          familyRef("SIMULATED_PRESSURE", 0.55),
        ],
      }),
      policy({
        id: "def-passing-down",
        side: "DEFENSE",
        label: "Passing Down Menu",
        situation: {
          downs: [2, 3, 4],
          distanceBuckets: ["MEDIUM", "LONG", "VERY_LONG"],
        },
        candidates: [
          familyRef("MAN_COVERAGE", 1.05),
          familyRef("SIMULATED_PRESSURE", 1.0),
          familyRef("DROP_EIGHT", 0.8),
          familyRef("BRACKET_SPECIALTY", 0.7),
          familyRef("THREE_HIGH_PACKAGE", 0.55),
          familyRef("FIRE_ZONE", 0.9),
          familyRef("ZERO_PRESSURE", 0.65),
          familyRef("ZONE_COVERAGE", 0.75),
        ],
      }),
      policy({
        id: "def-short-yardage",
        side: "DEFENSE",
        label: "Short Yardage",
        situation: {
          downs: [3, 4],
          distanceBuckets: ["INCHES", "SHORT"],
        },
        candidates: [
          familyRef("RUN_BLITZ", 1.15),
          familyRef("ZERO_PRESSURE", 1.0),
          familyRef("MATCH_COVERAGE", 0.7),
          familyRef("ZONE_COVERAGE", 0.65),
          familyRef("RED_ZONE_PACKAGE", 0.6),
        ],
      }),
      policy({
        id: "def-red-zone",
        side: "DEFENSE",
        label: "Red Zone",
        situation: {
          fieldZones: ["HIGH_RED_ZONE", "LOW_RED_ZONE", "GOAL_TO_GO"],
        },
        candidates: [
          familyRef("RED_ZONE_PACKAGE", 1.35),
          familyRef("BRACKET_SPECIALTY", 0.95),
          familyRef("RUN_BLITZ", 0.72),
          familyRef("MAN_COVERAGE", 0.8),
          familyRef("FIRE_ZONE", 0.55),
          familyRef("MATCH_COVERAGE", 0.55),
        ],
      }),
      policy({
        id: "def-two-minute",
        side: "DEFENSE",
        label: "Two Minute",
        situation: {
          clockBuckets: ["TWO_MINUTE", "ENDGAME"],
        },
        candidates: [
          familyRef("ZONE_COVERAGE", 1.0),
          familyRef("THREE_HIGH_PACKAGE", 0.95),
          familyRef("DROP_EIGHT", 0.85),
          familyRef("MAN_COVERAGE", 0.82),
          familyRef("BRACKET_SPECIALTY", 0.68),
          familyRef("SIMULATED_PRESSURE", 0.78),
          familyRef("FIRE_ZONE", 0.55),
        ],
      }),
    ],
  };
}
