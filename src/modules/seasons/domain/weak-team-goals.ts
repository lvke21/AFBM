export type MatchExpectationCategory =
  | "heavy underdog"
  | "underdog"
  | "even"
  | "favorite";

export type MatchExpectation = {
  category: MatchExpectationCategory;
  expectedMargin: number;
  expectedPointsFloor: number;
  ratingDiff: number;
  summary: string;
};

export type MoralVictoryReason = {
  code: string;
  title: string;
  description: string;
};

export type MoralVictoryAssessment = {
  expectation: MatchExpectation;
  moraleDelta: number;
  progressionXpBonus: number;
  reasons: MoralVictoryReason[];
  seasonGoals: string[];
  status: "moral victory" | "upset" | "expected result" | "missed opportunity";
  summary: string;
};

export type EvaluateMoralVictoryInput = {
  opponentName: string;
  opponentRating: number | null | undefined;
  opponentScore: number | null | undefined;
  opponentTurnovers?: number | null;
  teamName: string;
  teamRating: number | null | undefined;
  teamScore: number | null | undefined;
  teamTurnovers?: number | null;
};

export type UnderdogObjectiveId =
  | "KEEP_IT_CLOSE"
  | "PROTECT_THE_BALL"
  | "OVERPERFORM_OFFENSE"
  | "LIMIT_THEIR_OFFENSE";

export type UnderdogObjectiveDefinition = {
  id: UnderdogObjectiveId;
  title: string;
  description: string;
  target: string;
};

export type UnderdogObjectiveStatus = "fulfilled" | "partial" | "missed";

export type UnderdogObjectiveResult = UnderdogObjectiveDefinition & {
  status: UnderdogObjectiveStatus;
  explanation: string;
};

export type UnderdogObjectiveAssessment = {
  expectation: MatchExpectation;
  objectives: UnderdogObjectiveResult[];
  moraleSignal: number;
  progressionSignal: number;
  rebuildSignal: boolean;
  summary: string;
};

function knownRating(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ratingOrDefault(value: number | null | undefined) {
  return knownRating(value) ? value : 75;
}

export function classifyMatchExpectation(input: {
  opponentRating: number | null | undefined;
  teamRating: number | null | undefined;
}): MatchExpectation {
  const teamRating = ratingOrDefault(input.teamRating);
  const opponentRating = ratingOrDefault(input.opponentRating);
  const ratingDiff = teamRating - opponentRating;

  if (ratingDiff <= -11) {
    return {
      category: "heavy underdog",
      expectedMargin: 18,
      expectedPointsFloor: 10,
      ratingDiff,
      summary: "Klarer Underdog: Ein knappes Spiel, genug Punkte oder stabile Defense sind echte Fortschritte.",
    };
  }

  if (ratingDiff <= -4) {
    return {
      category: "underdog",
      expectedMargin: 10,
      expectedPointsFloor: 14,
      ratingDiff,
      summary: "Underdog: Das Ziel ist, das Spiel lange offen zu halten und Fehler zu begrenzen.",
    };
  }

  if (ratingDiff < 4) {
    return {
      category: "even",
      expectedMargin: 4,
      expectedPointsFloor: 17,
      ratingDiff,
      summary: "Ausgeglichen: Kleine Entscheidungen, Turnovers und Red Zone sollten den Unterschied machen.",
    };
  }

  return {
    category: "favorite",
    expectedMargin: -7,
    expectedPointsFloor: 20,
    ratingDiff,
    summary: "Favorit: Der Anspruch ist ein kontrolliertes Spiel ohne vermeidbare Fehler.",
  };
}

export function buildSeasonGoals(expectation: MatchExpectation) {
  if (expectation.category === "heavy underdog") {
    return [
      "Halte klare Mismatches unter drei Scores Abstand.",
      "Erziele mindestens 10 Punkte gegen staerkere Gegner.",
      "Vermeide mehrere Blowouts in Folge.",
      "Schlage im Saisonverlauf mindestens einen besseren Gegner.",
    ];
  }

  if (expectation.category === "underdog") {
    return [
      "Halte Underdog-Spiele bis ins vierte Quarter offen.",
      "Verliere knappe Spiele nicht durch mehr als zwei Turnovers.",
      "Erreiche mehrere One-Score- oder Two-Score-Games.",
      "Nutze ein Upset-Fenster gegen einen besseren Gegner.",
    ];
  }

  if (expectation.category === "even") {
    return [
      "Gewinne die Turnover-Bilanz.",
      "Halte Red-Zone-Chancen effizient.",
      "Verwandle ausgeglichene Matchups in knappe Siege.",
      "Stabilisiere Fatigue und Development ueber die Woche.",
    ];
  }

  return [
    "Kontrolliere Favoritenspiele ohne späte Hektik.",
    "Vermeide verschenkte Drives durch Turnovers.",
    "Halte schwächere Gegner unter ihrem erwarteten Score.",
    "Nutze klare Spiele fuer Development-Snaps.",
  ];
}

function isUnderdogExpectation(expectation: MatchExpectation) {
  return expectation.category === "heavy underdog" || expectation.category === "underdog";
}

export function selectUnderdogObjectives(expectation: MatchExpectation): UnderdogObjectiveDefinition[] {
  if (!isUnderdogExpectation(expectation)) {
    return [];
  }

  const closeTarget = expectation.category === "heavy underdog" ? "innerhalb von 16 Punkten" : "innerhalb von 8 Punkten";
  const maxTurnovers = expectation.category === "heavy underdog" ? 2 : 1;
  const opponentCap = expectation.category === "heavy underdog" ? 28 : 24;

  return [
    {
      id: "KEEP_IT_CLOSE",
      title: "Keep It Close",
      description: "Halte das Spiel im realistischen Schlagdistanz-Korridor.",
      target: `Endergebnis ${closeTarget}`,
    },
    {
      id: "PROTECT_THE_BALL",
      title: "Protect The Ball",
      description: "Gib dem Favoriten keine kurzen Felder durch vermeidbare Ballverluste.",
      target: `max. ${maxTurnovers} Turnover`,
    },
    {
      id: "OVERPERFORM_OFFENSE",
      title: "Overperform Offense",
      description: "Erziele mehr Punkte als die Matchup-Erwartung vorgibt.",
      target: `${expectation.expectedPointsFloor + 4}+ Punkte`,
    },
    {
      id: "LIMIT_THEIR_OFFENSE",
      title: "Limit Their Offense",
      description: "Halte die gegnerische Offense unter ihrer Komfortzone.",
      target: `Gegner bei ${opponentCap} oder weniger Punkten halten`,
    },
  ];
}

function buildObjectiveReward(results: UnderdogObjectiveResult[]) {
  const fulfilled = results.filter((objective) => objective.status === "fulfilled").length;
  const partial = results.filter((objective) => objective.status === "partial").length;
  const score = fulfilled + partial * 0.5;

  return {
    moraleSignal: score >= 2 ? 1 : 0,
    progressionSignal: fulfilled >= 3 ? 3 : fulfilled >= 2 ? 2 : fulfilled >= 1 || partial >= 2 ? 1 : 0,
    rebuildSignal: fulfilled >= 2 || (fulfilled >= 1 && partial >= 2),
  };
}

export function evaluateUnderdogObjectives(input: EvaluateMoralVictoryInput): UnderdogObjectiveAssessment {
  const expectation = classifyMatchExpectation({
    opponentRating: input.opponentRating,
    teamRating: input.teamRating,
  });
  const definitions = selectUnderdogObjectives(expectation);

  if (definitions.length === 0) {
    return {
      expectation,
      objectives: [],
      moraleSignal: 0,
      progressionSignal: 0,
      rebuildSignal: false,
      summary: "Keine Underdog Objectives fuer ausgeglichene Spiele oder Favoritenrollen.",
    };
  }

  if (input.teamScore == null || input.opponentScore == null) {
    return {
      expectation,
      objectives: definitions.map((objective) => ({
        ...objective,
        status: "partial",
        explanation: "Auswertung erscheint nach dem finalen Score.",
      })),
      moraleSignal: 0,
      progressionSignal: 0,
      rebuildSignal: false,
      summary: "Underdog Objectives sind vor dem Spiel aktiv und werden nach Spielende bewertet.",
    };
  }

  const margin = Math.abs(input.teamScore - input.opponentScore);
  const teamScore = input.teamScore;
  const opponentScore = input.opponentScore;
  const closeFull = expectation.category === "heavy underdog" ? 16 : 8;
  const closePartial = expectation.category === "heavy underdog" ? 21 : 14;
  const maxTurnovers = expectation.category === "heavy underdog" ? 2 : 1;
  const opponentCap = expectation.category === "heavy underdog" ? 28 : 24;
  const opponentPartialCap = opponentCap + 7;

  const objectives = definitions.map((objective): UnderdogObjectiveResult => {
    if (objective.id === "KEEP_IT_CLOSE") {
      return {
        ...objective,
        status: margin <= closeFull ? "fulfilled" : margin <= closePartial ? "partial" : "missed",
        explanation:
          margin <= closeFull
            ? `Nur ${margin} Punkte Abstand - Ziel erfuellt.`
            : margin <= closePartial
              ? `${margin} Punkte Abstand - teilweise erreicht, aber ausserhalb des Hauptziels.`
              : `${margin} Punkte Abstand - Ziel verfehlt.`,
      };
    }

    if (objective.id === "PROTECT_THE_BALL") {
      if (input.teamTurnovers == null) {
        return {
          ...objective,
          status: "partial",
          explanation: "Turnover-Stats fehlen - Ziel nicht voll auswertbar.",
        };
      }

      return {
        ...objective,
        status: input.teamTurnovers <= maxTurnovers ? "fulfilled" : input.teamTurnovers === maxTurnovers + 1 ? "partial" : "missed",
        explanation:
          input.teamTurnovers <= maxTurnovers
            ? `${input.teamTurnovers} Turnover - Ziel erfuellt.`
            : input.teamTurnovers === maxTurnovers + 1
              ? `${input.teamTurnovers} Turnover - knapp zu viel, teilweise erreicht.`
              : `${input.teamTurnovers} Turnover - Ziel verfehlt.`,
      };
    }

    if (objective.id === "OVERPERFORM_OFFENSE") {
      const fullTarget = expectation.expectedPointsFloor + 4;

      return {
        ...objective,
        status: teamScore >= fullTarget ? "fulfilled" : teamScore >= expectation.expectedPointsFloor ? "partial" : "missed",
        explanation:
          teamScore >= fullTarget
            ? `${teamScore} Punkte - Offense ueber Erwartung.`
            : teamScore >= expectation.expectedPointsFloor
              ? `${teamScore} Punkte - Erwartungsboden erreicht, Ziel teilweise erfuellt.`
              : `${teamScore} Punkte - unter dem Erwartungsboden.`,
      };
    }

    return {
      ...objective,
      status: opponentScore <= opponentCap ? "fulfilled" : opponentScore <= opponentPartialCap ? "partial" : "missed",
      explanation:
        opponentScore <= opponentCap
          ? `${input.opponentName} bei ${opponentScore} Punkten gehalten - Ziel erfuellt.`
          : opponentScore <= opponentPartialCap
            ? `${input.opponentName} erzielte ${opponentScore} Punkte - teilweise stabilisiert.`
            : `${input.opponentName} erzielte ${opponentScore} Punkte - Ziel verfehlt.`,
    };
  });
  const reward = buildObjectiveReward(objectives);
  const fulfilled = objectives.filter((objective) => objective.status === "fulfilled").length;
  const partial = objectives.filter((objective) => objective.status === "partial").length;

  return {
    expectation,
    objectives,
    ...reward,
    summary: `${fulfilled} Objective(s) erfuellt, ${partial} teilweise erfuellt. ${
      reward.rebuildSignal
        ? "Zaehlt als leichtes Rebuild-Signal."
        : "Noch kein klares Rebuild-Signal aus den Objectives."
    }`,
  };
}

function buildReward(reasonCount: number, upset: boolean) {
  if (upset) {
    return {
      moraleDelta: 2,
      progressionXpBonus: 6,
    };
  }

  if (reasonCount >= 2) {
    return {
      moraleDelta: 1,
      progressionXpBonus: 4,
    };
  }

  if (reasonCount === 1) {
    return {
      moraleDelta: 1,
      progressionXpBonus: 2,
    };
  }

  return {
    moraleDelta: 0,
    progressionXpBonus: 0,
  };
}

export function evaluateMoralVictory(input: EvaluateMoralVictoryInput): MoralVictoryAssessment {
  const expectation = classifyMatchExpectation({
    opponentRating: input.opponentRating,
    teamRating: input.teamRating,
  });
  const seasonGoals = buildSeasonGoals(expectation);

  if (input.teamScore == null || input.opponentScore == null) {
    return {
      expectation,
      moraleDelta: 0,
      progressionXpBonus: 0,
      reasons: [],
      seasonGoals,
      status: "expected result",
      summary: "Moral-Victory-Auswertung erscheint nach dem finalen Score.",
    };
  }

  const scoreDiff = input.teamScore - input.opponentScore;
  const margin = Math.abs(scoreDiff);
  const won = scoreDiff > 0;
  const lost = scoreDiff < 0;
  const underdog =
    expectation.category === "heavy underdog" || expectation.category === "underdog";
  const reasons: MoralVictoryReason[] = [];

  if (won && underdog) {
    reasons.push({
      code: "UPSET",
      title: "Upset geschafft",
      description: `${input.teamName} hat als ${expectation.category} ein staerkeres Team geschlagen.`,
    });
  }

  if (lost && underdog && margin <= Math.max(7, expectation.expectedMargin - 2)) {
    reasons.push({
      code: "CLOSE_UNDERDOG_LOSS",
      title: "Niederlage knapp gehalten",
      description: `Der Rueckstand blieb bei ${margin} Punkten und damit besser als die Erwartung fuer dieses Matchup.`,
    });
  }

  if (underdog && input.teamScore >= expectation.expectedPointsFloor + 4) {
    reasons.push({
      code: "OFFENSE_ABOVE_EXPECTATION",
      title: "Mehr Punkte als erwartet",
      description: `${input.teamName} erzielte ${input.teamScore} Punkte, obwohl die Erwartung nur bei etwa ${expectation.expectedPointsFloor}+ lag.`,
    });
  }

  if (underdog && input.opponentScore <= 24) {
    reasons.push({
      code: "DEFENSE_HELD_STRONG_TEAM",
      title: "Defense hielt dagegen",
      description: `${input.opponentName} blieb bei ${input.opponentScore} Punkten; fuer einen Underdog ist das ein belastbarer Defensiv-Erfolg.`,
    });
  }

  if (
    underdog &&
    lost &&
    margin < 21 &&
    margin <= expectation.expectedMargin + 4
  ) {
    reasons.push({
      code: "BLOWOUT_AVOIDED",
      title: "Blowout vermieden",
      description: "Das Team blieb unter der Blowout-Schwelle und hat das Match nicht frueh komplett verloren.",
    });
  }

  if (
    underdog &&
    input.teamTurnovers != null &&
    input.opponentTurnovers != null &&
    input.teamTurnovers <= input.opponentTurnovers
  ) {
    reasons.push({
      code: "TURNOVERS_CONTROLLED",
      title: "Ball sauber gehalten",
      description: "Die Turnover-Bilanz war mindestens ausgeglichen, was fuer schwache Teams ein wichtiger Stabilitaetsanker ist.",
    });
  }

  const upset = reasons.some((reason) => reason.code === "UPSET");
  const reward = buildReward(reasons.length, upset);
  const status =
    upset ? "upset" : reasons.length > 0 ? "moral victory" : won ? "expected result" : "missed opportunity";

  return {
    expectation,
    ...reward,
    reasons,
    seasonGoals,
    status,
    summary:
      reasons.length > 0
        ? `${reasons.length} Erfolgsmoment(e): ${reasons.map((reason) => reason.title).join(", ")}.`
        : "Kein Moral Victory: Ergebnis und Teilziele lagen nicht ueber der Matchup-Erwartung.",
  };
}
