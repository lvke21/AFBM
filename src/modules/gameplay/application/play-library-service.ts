import { resolveCompetitionRuleProfile } from "../domain/competition-rules";
import type { CompetitionRuleset } from "../domain/competition-rules";
import type {
  ClockBucket,
  DistanceBucket,
  FieldZone,
  GameSituationSnapshot,
  ScoreBucket,
  TempoProfile,
} from "../domain/game-situation";
import type { SituationFilter } from "../domain/playbook";
import type {
  PlayCallDefinition,
  PlayCallFamily,
  PlayCallSide,
  PlayDefinitionValidationIssue,
  PlayDefinitionValidationIssueCode,
  PlayDefinitionValidationResult,
  PlayLibraryCatalog,
  PlayLibraryValidationResult,
  PlayValidationSummary,
} from "../domain/play-library";
import {
  isDefensivePlayFamily,
  isOffensivePlayFamily,
} from "../domain/play-library";
import type { PreSnapStructureSnapshot } from "../domain/pre-snap-structure";
import { PLAY_LIBRARY_CATALOG } from "../infrastructure/play-library";
import { validatePreSnapStructure } from "./pre-snap-legality-engine";

export type SituationalPlayMatch = {
  play: PlayCallDefinition;
  matchedTriggerIds: string[];
  highestPriority: number;
};

type CatalogIndex = {
  personnelPackages: Map<string, PlayLibraryCatalog["personnelPackages"][number]>;
  offenseFormationFamilies: Map<
    string,
    PlayLibraryCatalog["offenseFormationFamilies"][number]
  >;
  defenseFormationFamilies: Map<
    string,
    PlayLibraryCatalog["defenseFormationFamilies"][number]
  >;
  motionFamilies: Map<string, PlayLibraryCatalog["motionFamilies"][number]>;
  protectionFamilies: Map<
    string,
    PlayLibraryCatalog["protectionFamilies"][number]
  >;
  offensiveConceptFamilies: Map<
    string,
    PlayLibraryCatalog["offensiveConceptFamilies"][number]
  >;
  frontFamilies: Map<string, PlayLibraryCatalog["frontFamilies"][number]>;
  coverageFamilies: Map<string, PlayLibraryCatalog["coverageFamilies"][number]>;
  pressureFamilies: Map<string, PlayLibraryCatalog["pressureFamilies"][number]>;
  plays: Map<string, PlayCallDefinition>;
};

function createIssue(
  code: PlayDefinitionValidationIssueCode,
  playId: string | null,
  message: string,
): PlayDefinitionValidationIssue {
  return {
    code,
    playId,
    message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOwn<K extends string>(
  value: Record<string, unknown>,
  key: K,
): value is Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isNonEmptyString);
}

function isPlayCallFamily(value: string): value is PlayCallFamily {
  return (
    isOffensivePlayFamily(value as PlayCallFamily) ||
    isDefensivePlayFamily(value as PlayCallFamily)
  );
}

function listSidePlays(
  side: PlayCallSide,
  catalog: PlayLibraryCatalog,
): PlayCallDefinition[] {
  return side === "OFFENSE" ? catalog.offensePlays : catalog.defensePlays;
}

function buildCatalogIndex(catalog: PlayLibraryCatalog): CatalogIndex {
  return {
    personnelPackages: new Map(
      catalog.personnelPackages.map((entry) => [entry.id, entry]),
    ),
    offenseFormationFamilies: new Map(
      catalog.offenseFormationFamilies.map((entry) => [entry.id, entry]),
    ),
    defenseFormationFamilies: new Map(
      catalog.defenseFormationFamilies.map((entry) => [entry.id, entry]),
    ),
    motionFamilies: new Map(
      catalog.motionFamilies.map((entry) => [entry.id, entry]),
    ),
    protectionFamilies: new Map(
      catalog.protectionFamilies.map((entry) => [entry.id, entry]),
    ),
    offensiveConceptFamilies: new Map(
      catalog.offensiveConceptFamilies.map((entry) => [entry.id, entry]),
    ),
    frontFamilies: new Map(catalog.frontFamilies.map((entry) => [entry.id, entry])),
    coverageFamilies: new Map(
      catalog.coverageFamilies.map((entry) => [entry.id, entry]),
    ),
    pressureFamilies: new Map(
      catalog.pressureFamilies.map((entry) => [entry.id, entry]),
    ),
    plays: new Map(
      listAllPlayCalls(catalog).map((entry) => [entry.id, entry]),
    ),
  };
}

function readPlayId(play: unknown): string | null {
  if (!isRecord(play)) {
    return null;
  }

  return isNonEmptyString(play.id) ? play.id : null;
}

function readPlaySide(play: unknown): PlayCallSide | null {
  if (!isRecord(play)) {
    return null;
  }

  return play.side === "OFFENSE" || play.side === "DEFENSE" ? play.side : null;
}

function matchesArrayFilter<T extends string | number>(
  value: T,
  filterValues?: ReadonlyArray<T>,
) {
  return !filterValues || filterValues.includes(value);
}

function extractPlayFieldZones(play: Record<string, unknown>): FieldZone[] {
  if (!Array.isArray(play.triggers)) {
    return [];
  }

  const fieldZones = new Set<FieldZone>();

  for (const trigger of play.triggers) {
    if (!isRecord(trigger) || !isRecord(trigger.filter)) {
      continue;
    }

    for (const zone of asStringArray(trigger.filter.fieldZones)) {
      fieldZones.add(zone as FieldZone);
    }
  }

  return [...fieldZones];
}

function createValidationSituation(
  ruleset: CompetitionRuleset,
  play: PlayCallDefinition,
): GameSituationSnapshot {
  const profile = resolveCompetitionRuleProfile(ruleset);
  const distanceBucket: DistanceBucket = play.situationTags.includes("SHORT_YARDAGE")
    ? "SHORT"
    : play.situationTags.includes("PASSING_DOWN")
      ? "LONG"
      : "MEDIUM";
  const fieldZone: FieldZone = play.situationTags.includes("GOAL_LINE")
    ? "GOAL_TO_GO"
    : play.situationTags.includes("RED_ZONE")
      ? "LOW_RED_ZONE"
      : play.situationTags.includes("BACKED_UP")
        ? "BACKED_UP"
        : "MIDFIELD";
  const clockBucket: ClockBucket = play.situationTags.includes("TWO_MINUTE")
    ? "TWO_MINUTE"
    : "MIDDLE";
  const scoreBucket: ScoreBucket = play.situationTags.includes("FOUR_MINUTE")
    ? "LEADING"
    : "TIED";
  const tempoProfile: TempoProfile = play.situationTags.includes("TWO_MINUTE")
    ? "TWO_MINUTE"
    : "NORMAL";

  return {
    ruleset,
    hashMarkProfile: profile.hashMarks,
    quarter: 2,
    down: distanceBucket === "LONG" ? 3 : 2,
    yardsToGo: distanceBucket === "SHORT" ? 2 : distanceBucket === "LONG" ? 9 : 6,
    // Field position moves from the offense's own goal line (0) to the defense's goal line (100).
    ballOnYardLine: fieldZone === "GOAL_TO_GO" ? 97 : fieldZone === "LOW_RED_ZONE" ? 92 : 50,
    distanceBucket,
    fieldZone,
    clockBucket,
    scoreBucket,
    offenseScore: scoreBucket === "LEADING" ? 24 : 14,
    defenseScore: scoreBucket === "LEADING" ? 17 : 14,
    secondsRemainingInQuarter: clockBucket === "TWO_MINUTE" ? 95 : 540,
    secondsRemainingInGame: clockBucket === "TWO_MINUTE" ? 95 : 1740,
    offenseTimeouts: 3,
    defenseTimeouts: 3,
    tempoProfile,
    possessionTeamId: "offense",
    defenseTeamId: "defense",
  };
}

function buildSafeCatalog(candidate: unknown) {
  if (!isRecord(candidate)) {
    return {
      catalog: {
        version: 1,
        personnelPackages: [],
        offenseFormationFamilies: [],
        defenseFormationFamilies: [],
        motionFamilies: [],
        protectionFamilies: [],
        offensiveConceptFamilies: [],
        frontFamilies: [],
        coverageFamilies: [],
        pressureFamilies: [],
        offensePlays: [],
        defensePlays: [],
      } satisfies PlayLibraryCatalog,
      issues: [
        createIssue(
          "PLAY_NOT_OBJECT",
          null,
          "Play library catalog must be an object.",
        ),
      ],
    };
  }

  const issues: PlayDefinitionValidationIssue[] = [];
  const catalog = {
    version: candidate.version === 1 ? 1 : 1,
    personnelPackages: Array.isArray(candidate.personnelPackages)
      ? (candidate.personnelPackages as PlayLibraryCatalog["personnelPackages"])
      : [],
    offenseFormationFamilies: Array.isArray(candidate.offenseFormationFamilies)
      ? (candidate.offenseFormationFamilies as PlayLibraryCatalog["offenseFormationFamilies"])
      : [],
    defenseFormationFamilies: Array.isArray(candidate.defenseFormationFamilies)
      ? (candidate.defenseFormationFamilies as PlayLibraryCatalog["defenseFormationFamilies"])
      : [],
    motionFamilies: Array.isArray(candidate.motionFamilies)
      ? (candidate.motionFamilies as PlayLibraryCatalog["motionFamilies"])
      : [],
    protectionFamilies: Array.isArray(candidate.protectionFamilies)
      ? (candidate.protectionFamilies as PlayLibraryCatalog["protectionFamilies"])
      : [],
    offensiveConceptFamilies: Array.isArray(candidate.offensiveConceptFamilies)
      ? (candidate.offensiveConceptFamilies as PlayLibraryCatalog["offensiveConceptFamilies"])
      : [],
    frontFamilies: Array.isArray(candidate.frontFamilies)
      ? (candidate.frontFamilies as PlayLibraryCatalog["frontFamilies"])
      : [],
    coverageFamilies: Array.isArray(candidate.coverageFamilies)
      ? (candidate.coverageFamilies as PlayLibraryCatalog["coverageFamilies"])
      : [],
    pressureFamilies: Array.isArray(candidate.pressureFamilies)
      ? (candidate.pressureFamilies as PlayLibraryCatalog["pressureFamilies"])
      : [],
    offensePlays: Array.isArray(candidate.offensePlays)
      ? (candidate.offensePlays as PlayLibraryCatalog["offensePlays"])
      : [],
    defensePlays: Array.isArray(candidate.defensePlays)
      ? (candidate.defensePlays as PlayLibraryCatalog["defensePlays"])
      : [],
  } satisfies PlayLibraryCatalog;

  const requiredCollections = [
    "personnelPackages",
    "offenseFormationFamilies",
    "defenseFormationFamilies",
    "motionFamilies",
    "protectionFamilies",
    "offensiveConceptFamilies",
    "frontFamilies",
    "coverageFamilies",
    "pressureFamilies",
    "offensePlays",
    "defensePlays",
  ] as const;

  for (const collectionName of requiredCollections) {
    if (!Array.isArray(candidate[collectionName])) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE",
          null,
          `Play library catalog is missing collection ${collectionName}.`,
        ),
      );
    }
  }

  return { catalog, issues };
}

function validateMetricRange(
  playId: string | null,
  metrics: Record<string, unknown>,
): PlayDefinitionValidationIssue[] {
  const issues: PlayDefinitionValidationIssue[] = [];
  const boundedMetrics = [
    "efficiencyRate",
    "explosiveRate",
    "turnoverSwingRate",
    "pressureRate",
    "redZoneValue",
  ] as const;

  for (const metricName of boundedMetrics) {
    const metricValue = metrics[metricName];

    if (
      typeof metricValue !== "number" ||
      Number.isNaN(metricValue) ||
      metricValue < 0 ||
      metricValue > 1
    ) {
      issues.push(
        createIssue(
          "INVALID_METRIC_RANGE",
          playId,
          `Metric ${metricName} must be a number between 0 and 1.`,
        ),
      );
    }
  }

  if (
    typeof metrics.expectedYards !== "number" ||
    Number.isNaN(metrics.expectedYards) ||
    metrics.expectedYards < 0
  ) {
    issues.push(
      createIssue(
        "INVALID_METRIC_RANGE",
        playId,
        "Metric expectedYards must be a non-negative number.",
      ),
    );
  }

  return issues;
}

function validateOptionalPlayMetadata(
  playRecord: Record<string, unknown>,
  playId: string | null,
): PlayDefinitionValidationIssue[] {
  const issues: PlayDefinitionValidationIssue[] = [];

  if (
    hasOwn(playRecord, "variantGroupId") &&
    playRecord.variantGroupId !== null &&
    !isNonEmptyString(playRecord.variantGroupId)
  ) {
    issues.push(
      createIssue(
        "INVALID_OPTIONAL_METADATA",
        playId,
        "Optional field variantGroupId must be a non-empty string or null.",
      ),
    );
  }

  if (hasOwn(playRecord, "packageTags")) {
    if (!Array.isArray(playRecord.packageTags)) {
      issues.push(
        createIssue(
          "INVALID_OPTIONAL_METADATA",
          playId,
          "Optional field packageTags must be an array of non-empty strings.",
        ),
      );
    } else if (playRecord.packageTags.some((entry) => !isNonEmptyString(entry))) {
      issues.push(
        createIssue(
          "INVALID_OPTIONAL_METADATA",
          playId,
          "Optional field packageTags must only contain non-empty strings.",
        ),
      );
    }
  }

  return issues;
}

function validateLinkedPlayReferences(
  playRecord: Record<string, unknown>,
  playId: string | null,
  playSide: PlayCallSide | null,
  index: CatalogIndex,
): PlayDefinitionValidationIssue[] {
  const issues: PlayDefinitionValidationIssue[] = [];
  const triggers = Array.isArray(playRecord.triggers) ? playRecord.triggers : [];
  const reads = Array.isArray(playRecord.reads) ? playRecord.reads : [];
  const assignments = Array.isArray(playRecord.assignments)
    ? playRecord.assignments
    : [];
  const counters = Array.isArray(playRecord.counters) ? playRecord.counters : [];
  const audibles = Array.isArray(playRecord.audibles) ? playRecord.audibles : [];
  const triggerIds = new Set(
    triggers
      .filter(isRecord)
      .map((entry) => entry.id)
      .filter(isNonEmptyString),
  );
  const readIds = new Set(
    reads.filter(isRecord).map((entry) => entry.id).filter(isNonEmptyString),
  );

  for (const assignment of assignments) {
    if (!isRecord(assignment)) {
      continue;
    }

    if (
      hasOwn(assignment, "readId") &&
      assignment.readId !== null &&
      (!isNonEmptyString(assignment.readId) || !readIds.has(assignment.readId))
    ) {
      issues.push(
        createIssue(
          "INVALID_READ_REFERENCE",
          playId,
          `Assignment ${String(assignment.roleId ?? "unknown")} references a missing read.`,
        ),
      );
    }
  }

  for (const counter of counters) {
    if (!isRecord(counter) || !isNonEmptyString(counter.playId)) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE",
          playId,
          "Counter reference must point to an existing play id.",
        ),
      );
      continue;
    }

    const targetPlay = index.plays.get(counter.playId);

    if (!targetPlay) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE",
          playId,
          `Counter ${counter.playId} does not exist in the play library.`,
        ),
      );
      continue;
    }

    if (playSide && targetPlay.side !== playSide) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE_SIDE",
          playId,
          `Counter ${counter.playId} points to the other side of the ball.`,
        ),
      );
    }
  }

  for (const audible of audibles) {
    if (!isRecord(audible) || !isNonEmptyString(audible.playId)) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE",
          playId,
          "Audible reference must point to an existing play id.",
        ),
      );
      continue;
    }

    const targetPlay = index.plays.get(audible.playId);

    if (!targetPlay) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE",
          playId,
          `Audible ${audible.playId} does not exist in the play library.`,
        ),
      );
      continue;
    }

    if (playSide && targetPlay.side !== playSide) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE_SIDE",
          playId,
          `Audible ${audible.playId} points to the other side of the ball.`,
        ),
      );
    }

    if (
      hasOwn(audible, "triggerId") &&
      audible.triggerId !== null &&
      (!isNonEmptyString(audible.triggerId) || !triggerIds.has(audible.triggerId))
    ) {
      issues.push(
        createIssue(
          "INVALID_TRIGGER_REFERENCE",
          playId,
          `Audible ${audible.playId} references a trigger that is not defined on ${playId ?? "this play"}.`,
        ),
      );
    }
  }

  return issues;
}

function validateOffensiveStructure(
  playRecord: Record<string, unknown>,
  playId: string | null,
  family: string,
  supportedRulesets: string[],
  index: CatalogIndex,
): PlayDefinitionValidationIssue[] {
  const issues: PlayDefinitionValidationIssue[] = [];

  if (!isRecord(playRecord.structure)) {
    return issues;
  }

  const structure = playRecord.structure;
  const formationFamilyId = isNonEmptyString(structure.formationFamilyId)
    ? structure.formationFamilyId
    : null;
  const personnelPackageId = isNonEmptyString(structure.personnelPackageId)
    ? structure.personnelPackageId
    : null;
  const conceptFamilyId = isNonEmptyString(structure.conceptFamilyId)
    ? structure.conceptFamilyId
    : null;
  const motionFamilyIds = asStringArray(structure.motionFamilyIds);
  const protectionFamilyId =
    structure.protectionFamilyId === null || isNonEmptyString(structure.protectionFamilyId)
      ? structure.protectionFamilyId
      : undefined;

  if (!formationFamilyId || !index.offenseFormationFamilies.has(formationFamilyId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Offensive play references a missing offense formation family.",
      ),
    );
  }

  if (!personnelPackageId || !index.personnelPackages.has(personnelPackageId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Offensive play references a missing personnel package.",
      ),
    );
  } else if (index.personnelPackages.get(personnelPackageId)?.side !== "OFFENSE") {
    issues.push(
      createIssue(
        "INVALID_REFERENCE_SIDE",
        playId,
        "Offensive play must reference an offensive personnel package.",
      ),
    );
  }

  if (!conceptFamilyId || !index.offensiveConceptFamilies.has(conceptFamilyId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Offensive play references a missing concept family.",
      ),
    );
  } else if (index.offensiveConceptFamilies.get(conceptFamilyId)?.family !== family) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        `Concept family ${conceptFamilyId} does not match offensive family ${family}.`,
      ),
    );
  }

  for (const motionFamilyId of motionFamilyIds) {
    if (!index.motionFamilies.has(motionFamilyId)) {
      issues.push(
        createIssue(
          "INVALID_REFERENCE",
          playId,
          `Offensive play references unknown motion family ${motionFamilyId}.`,
        ),
      );
    }
  }

  if (
    protectionFamilyId &&
    typeof protectionFamilyId === "string" &&
    !index.protectionFamilies.has(protectionFamilyId)
  ) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        `Offensive play references unknown protection family ${protectionFamilyId}.`,
      ),
    );
  }

  const formationFamily = formationFamilyId
    ? index.offenseFormationFamilies.get(formationFamilyId)
    : undefined;

  if (
    formationFamily &&
    personnelPackageId &&
    formationFamily.personnelPackageId !== personnelPackageId
  ) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        `Formation family ${formationFamily.id} expects personnel ${formationFamily.personnelPackageId}, not ${personnelPackageId}.`,
      ),
    );
  }

  if (formationFamily) {
    for (const ruleset of supportedRulesets) {
      if (!formationFamily.supportedRulesets.includes(ruleset as CompetitionRuleset)) {
        issues.push(
          createIssue(
            "RULESET_MISMATCH",
            playId,
            `Formation family ${formationFamily.id} does not support ruleset ${ruleset}.`,
          ),
        );
      }
    }
  }

  if (!isRecord(playRecord.legalityTemplate)) {
    return issues;
  }

  const legalityTemplate = playRecord.legalityTemplate;

  if (!isRecord(legalityTemplate.formation)) {
    issues.push(
      createIssue(
        "MISSING_LEGALITY_TEMPLATE",
        playId,
        "Legality template must include a formation snapshot.",
      ),
    );
  } else {
    if (legalityTemplate.formation.side !== "OFFENSE") {
      issues.push(
        createIssue(
          "FAMILY_STRUCTURE_MISMATCH",
          playId,
          "Offensive play legality template must carry an offensive formation snapshot.",
        ),
      );
    }

    if (
      formationFamilyId &&
      legalityTemplate.formation.familyId !== formationFamilyId
    ) {
      issues.push(
        createIssue(
          "FAMILY_STRUCTURE_MISMATCH",
          playId,
          `Legality template formation family ${String(legalityTemplate.formation.familyId)} does not match structure ${formationFamilyId}.`,
        ),
      );
    }
  }

  if (
    isRecord(legalityTemplate.offensePersonnel) &&
    personnelPackageId &&
    legalityTemplate.offensePersonnel.id !== personnelPackageId
  ) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        `Legality template offense personnel ${String(legalityTemplate.offensePersonnel.id)} does not match structure ${personnelPackageId}.`,
      ),
    );
  }

  return issues;
}

function validateDefensiveStructure(
  playRecord: Record<string, unknown>,
  playId: string | null,
  family: string,
  supportedRulesets: string[],
  situationTags: string[],
  index: CatalogIndex,
): PlayDefinitionValidationIssue[] {
  const issues: PlayDefinitionValidationIssue[] = [];

  if (!isRecord(playRecord.structure)) {
    return issues;
  }

  const structure = playRecord.structure;
  const formationFamilyId = isNonEmptyString(structure.formationFamilyId)
    ? structure.formationFamilyId
    : null;
  const personnelPackageId = isNonEmptyString(structure.personnelPackageId)
    ? structure.personnelPackageId
    : null;
  const frontFamilyId = isNonEmptyString(structure.frontFamilyId)
    ? structure.frontFamilyId
    : null;
  const coverageFamilyId = isNonEmptyString(structure.coverageFamilyId)
    ? structure.coverageFamilyId
    : null;
  const pressureFamilyId =
    structure.pressureFamilyId === null || isNonEmptyString(structure.pressureFamilyId)
      ? structure.pressureFamilyId
      : undefined;
  const coverageShell = isNonEmptyString(structure.coverageShell)
    ? structure.coverageShell
    : null;
  const pressurePresentation = isNonEmptyString(structure.pressurePresentation)
    ? structure.pressurePresentation
    : null;
  const defensiveConceptTag =
    structure.defensiveConceptTag === null || isNonEmptyString(structure.defensiveConceptTag)
      ? structure.defensiveConceptTag
      : undefined;

  if (!formationFamilyId || !index.defenseFormationFamilies.has(formationFamilyId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Defensive play references a missing defense formation family.",
      ),
    );
  }

  if (!personnelPackageId || !index.personnelPackages.has(personnelPackageId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Defensive play references a missing personnel package.",
      ),
    );
  } else if (index.personnelPackages.get(personnelPackageId)?.side !== "DEFENSE") {
    issues.push(
      createIssue(
        "INVALID_REFERENCE_SIDE",
        playId,
        "Defensive play must reference a defensive personnel package.",
      ),
    );
  }

  if (!frontFamilyId || !index.frontFamilies.has(frontFamilyId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Defensive play references a missing front family.",
      ),
    );
  }

  if (!coverageFamilyId || !index.coverageFamilies.has(coverageFamilyId)) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        "Defensive play references a missing coverage family.",
      ),
    );
  }

  if (
    pressureFamilyId &&
    typeof pressureFamilyId === "string" &&
    !index.pressureFamilies.has(pressureFamilyId)
  ) {
    issues.push(
      createIssue(
        "INVALID_REFERENCE",
        playId,
        `Defensive play references unknown pressure family ${pressureFamilyId}.`,
      ),
    );
  }

  const formationFamily = formationFamilyId
    ? index.defenseFormationFamilies.get(formationFamilyId)
    : undefined;
  const coverageFamily = coverageFamilyId
    ? index.coverageFamilies.get(coverageFamilyId)
    : undefined;
  const pressureFamily =
    pressureFamilyId && typeof pressureFamilyId === "string"
      ? index.pressureFamilies.get(pressureFamilyId)
      : undefined;

  if (
    formationFamily &&
    personnelPackageId &&
    formationFamily.personnelPackageId !== personnelPackageId
  ) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        `Formation family ${formationFamily.id} expects personnel ${formationFamily.personnelPackageId}, not ${personnelPackageId}.`,
      ),
    );
  }

  if (formationFamily) {
    for (const ruleset of supportedRulesets) {
      if (!formationFamily.supportedRulesets.includes(ruleset as CompetitionRuleset)) {
        issues.push(
          createIssue(
            "RULESET_MISMATCH",
            playId,
            `Formation family ${formationFamily.id} does not support ruleset ${ruleset}.`,
          ),
        );
      }
    }
  }

  if (coverageFamily && coverageShell && coverageFamily.shell !== coverageShell) {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        `Coverage family ${coverageFamily.id} carries shell ${coverageFamily.shell}, not ${coverageShell}.`,
      ),
    );
  }

  if (
    pressureFamily &&
    pressurePresentation &&
    pressureFamily.presentation !== pressurePresentation
  ) {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        `Pressure family ${pressureFamily.id} presents ${pressureFamily.presentation}, not ${pressurePresentation}.`,
      ),
    );
  }

  if (family === "MATCH_COVERAGE" && coverageFamily && !coverageFamily.tags.includes("MATCH")) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        "Match coverage plays must reference a coverage family tagged MATCH.",
      ),
    );
  }

  if (family === "ZONE_COVERAGE" && coverageFamily && !coverageFamily.tags.includes("ZONE")) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        "Zone coverage plays must reference a coverage family tagged ZONE.",
      ),
    );
  }

  if (family === "MAN_COVERAGE" && coverageFamily && !coverageFamily.tags.includes("MAN")) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        "Man coverage plays must reference a coverage family tagged MAN.",
      ),
    );
  }

  if (
    family === "ZERO_PRESSURE" &&
    (coverageShell !== "ZERO" ||
      (pressurePresentation !== "FIVE_MAN" && pressurePresentation !== "SIX_MAN"))
  ) {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        "Zero pressure must live in zero shell with an aggressive five- or six-man presentation.",
      ),
    );
  }

  if (family === "FIRE_ZONE" && pressurePresentation !== "FIVE_MAN") {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        "Fire zone must present as a five-man pressure.",
      ),
    );
  }

  if (family === "SIMULATED_PRESSURE" && pressurePresentation !== "SIMULATED") {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        "Simulated pressure must preserve a simulated pressure presentation.",
      ),
    );
  }

  if (family === "DROP_EIGHT" && pressurePresentation !== "THREE_MAN") {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        "Drop-eight packages must preserve a three-man rush presentation.",
      ),
    );
  }

  if (
    family === "RUN_BLITZ" &&
    (pressurePresentation !== "FIVE_MAN" ||
      !situationTags.includes("RUN_FIT"))
  ) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        "Run blitz plays must carry RUN_FIT and present as five-man box pressure.",
      ),
    );
  }

  if (
    family === "BRACKET_SPECIALTY" &&
    (!Array.isArray(playRecord.assignments) ||
      !playRecord.assignments.some(
        (assignment) => assignment.assignmentType === "BRACKET",
      ))
  ) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        "Bracket specialty plays must include at least one BRACKET assignment.",
      ),
    );
  }

  if (
    family === "THREE_HIGH_PACKAGE" &&
    coverageShell !== "TWO_HIGH"
  ) {
    issues.push(
      createIssue(
        "PRESSURE_SHELL_MISMATCH",
        playId,
        "Three-high package plays currently map through the two-high shell abstraction.",
      ),
    );
  }

  if (family === "RED_ZONE_PACKAGE") {
    const coversRedZone =
      situationTags.includes("RED_ZONE") || situationTags.includes("GOAL_LINE");
    const fieldZones = extractPlayFieldZones(playRecord);

    if (!coversRedZone) {
      issues.push(
        createIssue(
          "SITUATION_TAG_MISMATCH",
          playId,
          "Red-zone packages must be tagged RED_ZONE or GOAL_LINE.",
        ),
      );
    }

    if (
      !fieldZones.some((zone) =>
        ["HIGH_RED_ZONE", "LOW_RED_ZONE", "GOAL_TO_GO"].includes(zone),
      )
    ) {
      issues.push(
        createIssue(
          "SITUATION_TAG_MISMATCH",
          playId,
          "Red-zone packages must target explicit red-zone field zones in their triggers.",
        ),
      );
    }
  }

  if (
    hasOwn(structure, "defensiveConceptTag") &&
    defensiveConceptTag === undefined
  ) {
    issues.push(
      createIssue(
        "INVALID_OPTIONAL_METADATA",
        playId,
        "Optional field structure.defensiveConceptTag must be a non-empty string or null.",
      ),
    );
  }

  if (!isRecord(playRecord.legalityTemplate)) {
    return issues;
  }

  const legalityTemplate = playRecord.legalityTemplate;

  if (!isRecord(legalityTemplate.formation)) {
    issues.push(
      createIssue(
        "MISSING_LEGALITY_TEMPLATE",
        playId,
        "Legality template must include a formation snapshot.",
      ),
    );
  } else {
    if (legalityTemplate.formation.side !== "DEFENSE") {
      issues.push(
        createIssue(
          "FAMILY_STRUCTURE_MISMATCH",
          playId,
          "Defensive play legality template must carry a defensive formation snapshot.",
        ),
      );
    }

    if (
      formationFamilyId &&
      legalityTemplate.formation.familyId !== formationFamilyId
    ) {
      issues.push(
        createIssue(
          "FAMILY_STRUCTURE_MISMATCH",
          playId,
          `Legality template formation family ${String(legalityTemplate.formation.familyId)} does not match structure ${formationFamilyId}.`,
        ),
      );
    }
  }

  if (
    isRecord(legalityTemplate.defensePersonnel) &&
    personnelPackageId &&
    legalityTemplate.defensePersonnel.id !== personnelPackageId
  ) {
    issues.push(
      createIssue(
        "FAMILY_STRUCTURE_MISMATCH",
        playId,
        `Legality template defense personnel ${String(legalityTemplate.defensePersonnel.id)} does not match structure ${personnelPackageId}.`,
      ),
    );
  }

  return issues;
}

function validatePreSnapCompatibility(
  playRecord: Record<string, unknown>,
  playId: string | null,
  supportedRulesets: string[],
  play: PlayCallDefinition,
): PlayDefinitionValidationIssue[] {
  const issues: PlayDefinitionValidationIssue[] = [];

  if (!isRecord(playRecord.legalityTemplate)) {
    return issues;
  }

  for (const ruleset of supportedRulesets) {
    const snapshot = buildPreSnapStructureForPlay(
      play,
      createValidationSituation(ruleset as CompetitionRuleset, play),
    );
    const legality = validatePreSnapStructure(snapshot);

    if (!legality.isLegal) {
      issues.push(
        createIssue(
          "PRE_SNAP_ILLEGAL",
          playId,
          `Pre-snap legality failed in ${ruleset}: ${legality.issues
            .map((issue) => issue.message)
            .join("; ")}`,
        ),
      );
    }
  }

  return issues;
}

export function getDefaultPlayLibraryCatalog(): PlayLibraryCatalog {
  return PLAY_LIBRARY_CATALOG;
}

export function listAllPlayCalls(
  catalog: PlayLibraryCatalog = PLAY_LIBRARY_CATALOG,
): PlayCallDefinition[] {
  return [...catalog.offensePlays, ...catalog.defensePlays];
}

export function findPlayById(
  playId: string,
  catalog: PlayLibraryCatalog = PLAY_LIBRARY_CATALOG,
): PlayCallDefinition | undefined {
  return listAllPlayCalls(catalog).find((play) => play.id === playId);
}

export function serializePlayLibraryCatalog(
  catalog: PlayLibraryCatalog = PLAY_LIBRARY_CATALOG,
): string {
  return JSON.stringify(catalog, null, 2);
}

export function parseSerializedPlayLibraryCatalog(
  serializedCatalog: string,
): PlayLibraryCatalog {
  const parsedCatalog = JSON.parse(serializedCatalog) as unknown;
  const validation = validatePlayLibraryCatalog(parsedCatalog);

  if (!validation.isValid) {
    throw new Error(
      `Invalid play library catalog: ${validation.issues
        .slice(0, 3)
        .map((issue) => issue.message)
        .join(" | ")}`,
    );
  }

  return parsedCatalog as PlayLibraryCatalog;
}

export function matchesSituationFilter(
  situation: GameSituationSnapshot,
  filter: SituationFilter,
  personnelPackageId?: string,
): boolean {
  if (!matchesArrayFilter(situation.ruleset, filter.rulesets)) {
    return false;
  }

  if (!matchesArrayFilter(situation.down, filter.downs)) {
    return false;
  }

  if (!matchesArrayFilter(situation.distanceBucket, filter.distanceBuckets)) {
    return false;
  }

  if (!matchesArrayFilter(situation.fieldZone, filter.fieldZones)) {
    return false;
  }

  if (!matchesArrayFilter(situation.clockBucket, filter.clockBuckets)) {
    return false;
  }

  if (!matchesArrayFilter(situation.scoreBucket, filter.scoreBuckets)) {
    return false;
  }

  if (!matchesArrayFilter(situation.tempoProfile, filter.tempoProfiles)) {
    return false;
  }

  if (
    filter.personnelPackages &&
    (!personnelPackageId || !filter.personnelPackages.includes(personnelPackageId))
  ) {
    return false;
  }

  return true;
}

export function getSituationalPlayMatches(input: {
  side: PlayCallSide;
  situation: GameSituationSnapshot;
  catalog?: PlayLibraryCatalog;
}): SituationalPlayMatch[] {
  const catalog = input.catalog ?? PLAY_LIBRARY_CATALOG;

  return listSidePlays(input.side, catalog)
    .filter((play) => play.supportedRulesets.includes(input.situation.ruleset))
    .map((play) => {
      const matchedTriggers = play.triggers.filter((trigger) =>
        matchesSituationFilter(
          input.situation,
          trigger.filter,
          play.structure.personnelPackageId,
        ),
      );

      return {
        play,
        matchedTriggerIds: matchedTriggers.map((trigger) => trigger.id),
        highestPriority: matchedTriggers.reduce(
          (highestPriority, trigger) =>
            Math.max(highestPriority, trigger.priority),
          0,
        ),
      };
    })
    .filter((match) => match.matchedTriggerIds.length > 0)
    .sort((left, right) => {
      if (right.highestPriority !== left.highestPriority) {
        return right.highestPriority - left.highestPriority;
      }

      return left.play.label.localeCompare(right.play.label);
    });
}

export function buildPreSnapStructureForPlay(
  play: PlayCallDefinition,
  situation: GameSituationSnapshot,
): PreSnapStructureSnapshot {
  return {
    ruleset: situation.ruleset,
    situation,
    offensePersonnel: structuredClone(play.legalityTemplate.offensePersonnel),
    defensePersonnel: structuredClone(play.legalityTemplate.defensePersonnel),
    formation: structuredClone(play.legalityTemplate.formation),
    offenseShift: structuredClone(play.legalityTemplate.offenseShift),
    offensePlayers: structuredClone(play.legalityTemplate.offensePlayers),
    defensePlayers: structuredClone(play.legalityTemplate.defensePlayers),
  };
}

export function validatePlayDefinition(
  play: unknown,
  catalog: PlayLibraryCatalog = PLAY_LIBRARY_CATALOG,
): PlayDefinitionValidationResult {
  const issues: PlayDefinitionValidationIssue[] = [];

  if (!isRecord(play)) {
    return {
      isValid: false,
      issues: [
        createIssue(
          "PLAY_NOT_OBJECT",
          null,
          "Play definition must be an object.",
        ),
      ],
    };
  }

  const playId = readPlayId(play);
  const playSide = readPlaySide(play);
  const family = isNonEmptyString(play.family) ? play.family : null;
  const normalizedFamily =
    family && isPlayCallFamily(family) ? family : null;
  const supportedRulesets = asStringArray(play.supportedRulesets);
  const situationTags = asStringArray(play.situationTags);
  const index = buildCatalogIndex(catalog);

  if (!playId) {
    issues.push(createIssue("MISSING_ID", null, "Play definition is missing id."));
  }

  if (!isNonEmptyString(play.label)) {
    issues.push(
      createIssue("MISSING_LABEL", playId, "Play definition is missing label."),
    );
  }

  if (!playSide) {
    issues.push(
      createIssue(
        "INVALID_SIDE",
        playId,
        "Play definition side must be OFFENSE or DEFENSE.",
      ),
    );
  }

  if (!family) {
    issues.push(
      createIssue(
        "INVALID_FAMILY",
        playId,
        "Play definition must declare a play family.",
      ),
    );
  } else if (
    !normalizedFamily ||
    (playSide === "OFFENSE" && !isOffensivePlayFamily(normalizedFamily)) ||
    (playSide === "DEFENSE" && !isDefensivePlayFamily(normalizedFamily))
  ) {
    issues.push(
      createIssue(
        "INVALID_FAMILY",
        playId,
        `Family ${family} does not match side ${playSide}.`,
      ),
    );
  }

  if (supportedRulesets.length === 0) {
    issues.push(
      createIssue(
        "MISSING_SUPPORTED_RULESETS",
        playId,
        "Play must support at least one ruleset.",
      ),
    );
  }

  if (!Array.isArray(play.triggers) || play.triggers.length === 0) {
    issues.push(
      createIssue(
        "MISSING_TRIGGERS",
        playId,
        "Play must define at least one trigger.",
      ),
    );
  }

  if (!Array.isArray(play.reads) || play.reads.length === 0) {
    issues.push(
      createIssue(
        "MISSING_READS",
        playId,
        "Play must define at least one read.",
      ),
    );
  }

  if (situationTags.length === 0) {
    issues.push(
      createIssue(
        "MISSING_SITUATION_TAGS",
        playId,
        "Play must define situation tags.",
      ),
    );
  }

  if (!Array.isArray(play.assignments) || play.assignments.length === 0) {
    issues.push(
      createIssue(
        "MISSING_ASSIGNMENTS",
        playId,
        "Play must define at least one assignment.",
      ),
    );
  }

  if (!Array.isArray(play.counters)) {
    issues.push(
      createIssue(
        "MISSING_COUNTERS",
        playId,
        "Play must define counters as an array.",
      ),
    );
  }

  if (!Array.isArray(play.audibles)) {
    issues.push(
      createIssue(
        "MISSING_AUDIBLES",
        playId,
        "Play must define audibles as an array.",
      ),
    );
  }

  if (!isRecord(play.structure)) {
    issues.push(
      createIssue("MISSING_STRUCTURE", playId, "Play must define structure data."),
    );
  }

  if (!isRecord(play.legalityTemplate)) {
    issues.push(
      createIssue(
        "MISSING_LEGALITY_TEMPLATE",
        playId,
        "Play must define legality template data.",
      ),
    );
  }

  if (!isRecord(play.expectedMetrics)) {
    issues.push(
      createIssue(
        "MISSING_EXPECTED_METRICS",
        playId,
        "Play must define expected metrics.",
      ),
    );
  } else {
    issues.push(...validateMetricRange(playId, play.expectedMetrics));
  }

  issues.push(...validateOptionalPlayMetadata(play, playId));

  issues.push(...validateLinkedPlayReferences(play, playId, playSide, index));

  if (
    playSide === "OFFENSE" &&
    normalizedFamily &&
    isOffensivePlayFamily(normalizedFamily)
  ) {
    issues.push(
      ...validateOffensiveStructure(
        play,
        playId,
        normalizedFamily,
        supportedRulesets,
        index,
      ),
    );
  }

  if (
    playSide === "DEFENSE" &&
    normalizedFamily &&
    isDefensivePlayFamily(normalizedFamily)
  ) {
    issues.push(
      ...validateDefensiveStructure(
        play,
        playId,
        normalizedFamily,
        supportedRulesets,
        situationTags,
        index,
      ),
    );
  }

  if (
    issues.length === 0 &&
    playSide &&
    normalizedFamily &&
    ((playSide === "OFFENSE" && isOffensivePlayFamily(normalizedFamily)) ||
      (playSide === "DEFENSE" && isDefensivePlayFamily(normalizedFamily)))
  ) {
    issues.push(
      ...validatePreSnapCompatibility(
        play,
        playId,
        supportedRulesets,
        play as PlayCallDefinition,
      ),
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export function validatePlayLibraryCatalog(
  catalog: unknown = PLAY_LIBRARY_CATALOG,
): PlayLibraryValidationResult {
  const { catalog: safeCatalog, issues } = buildSafeCatalog(catalog);
  const playResults: PlayValidationSummary[] = listAllPlayCalls(safeCatalog).map(
    (play) => {
      const result = validatePlayDefinition(play, safeCatalog);

      return {
        playId: play.id,
        side: play.side,
        isValid: result.isValid,
        issues: result.issues,
      };
    },
  );

  return {
    isValid:
      issues.length === 0 && playResults.every((playResult) => playResult.isValid),
    issues: [
      ...issues,
      ...playResults.flatMap((playResult) => playResult.issues),
    ],
    playResults,
  };
}
