import { MatchKind, MatchStatus, SeasonPhase } from "@/modules/shared/domain/enums";

type SimulatableMatchRef = {
  id: string;
  kind: MatchKind;
  status: MatchStatus;
};

type SeasonTransitionInput = {
  currentPhase: SeasonPhase;
  currentWeek: number;
  seasonLengthWeeks: number;
  createdPlayoffs: boolean;
  createdFinal: boolean;
  transitionTime: Date;
};

export function assertCurrentSeasonIsActive(
  seasonId: string,
  currentSeasonId: string | null | undefined,
) {
  if (!currentSeasonId || seasonId !== currentSeasonId) {
    throw new Error("Only the current season can be advanced by the engine");
  }
}

export function assertSeasonCanSimulate(phase: SeasonPhase) {
  if (phase === SeasonPhase.PRESEASON) {
    throw new Error("Preseason simulation is not supported by the current engine flow");
  }

  if (phase === SeasonPhase.OFFSEASON) {
    return false;
  }

  return true;
}

export function assertSeasonCanAdvanceToNextSeason(phase: SeasonPhase) {
  if (phase !== SeasonPhase.OFFSEASON) {
    throw new Error("The next season can only be created from the offseason state");
  }
}

export function assertWeekMatchesMatchSeasonPhase(
  phase: SeasonPhase,
  matches: SimulatableMatchRef[],
  expectedStatus: MatchStatus,
) {
  for (const match of matches) {
    if (match.status !== expectedStatus) {
      throw new Error(
        `Match ${match.id} is in state ${match.status}, expected ${expectedStatus} for simulation`,
      );
    }

    if (phase === SeasonPhase.REGULAR_SEASON && match.kind !== MatchKind.REGULAR_SEASON) {
      throw new Error(
        `Regular-season week contains non-regular match ${match.id} (${match.kind})`,
      );
    }

    if (phase === SeasonPhase.PLAYOFFS && match.kind !== MatchKind.PLAYOFF) {
      throw new Error(
        `Playoff week contains non-playoff match ${match.id} (${match.kind})`,
      );
    }
  }
}

export function buildSeasonTransition({
  currentPhase,
  currentWeek,
  seasonLengthWeeks,
  createdPlayoffs,
  createdFinal,
  transitionTime,
}: SeasonTransitionInput) {
  if (!Number.isInteger(currentWeek) || currentWeek < 1) {
    throw new Error("Season transition requires a positive current week");
  }

  if (!Number.isInteger(seasonLengthWeeks) || seasonLengthWeeks < 1) {
    throw new Error("Season transition requires a positive season length");
  }

  if (currentPhase === SeasonPhase.REGULAR_SEASON) {
    if (currentWeek < seasonLengthWeeks) {
      return {
        phase: SeasonPhase.REGULAR_SEASON,
        week: currentWeek + 1,
        endsAt: undefined,
      };
    }

    if (createdPlayoffs) {
      return {
        phase: SeasonPhase.PLAYOFFS,
        week: currentWeek + 1,
        endsAt: undefined,
      };
    }

    return {
      phase: SeasonPhase.OFFSEASON,
      week: currentWeek,
      endsAt: transitionTime,
    };
  }

  if (currentPhase === SeasonPhase.PLAYOFFS) {
    if (createdFinal) {
      return {
        phase: SeasonPhase.PLAYOFFS,
        week: currentWeek + 1,
        endsAt: undefined,
      };
    }

    return {
      phase: SeasonPhase.OFFSEASON,
      week: currentWeek,
      endsAt: transitionTime,
    };
  }

  if (currentPhase === SeasonPhase.OFFSEASON) {
    return {
      phase: SeasonPhase.OFFSEASON,
      week: currentWeek,
      endsAt: transitionTime,
    };
  }

  throw new Error(`Unsupported season phase transition from ${currentPhase}`);
}

export function resolveDecisiveWinnerTeamId(input: {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
}) {
  if (input.homeScore == null || input.awayScore == null) {
    return null;
  }

  if (input.homeScore === input.awayScore) {
    return null;
  }

  return input.homeScore > input.awayScore ? input.homeTeamId : input.awayTeamId;
}
