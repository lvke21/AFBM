import { describe, expect, it } from "vitest";

import { MatchStatus, SeasonPhase } from "@/modules/shared/domain/enums";
import {
  assertCurrentSeasonIsActive,
  assertSeasonCanAdvanceToNextSeason,
  assertSeasonCanSimulate,
  assertWeekMatchesMatchSeasonPhase,
  buildSeasonTransition,
  resolveDecisiveWinnerTeamId,
} from "./engine-state-machine";

describe("engine state machine", () => {
  it("allows only the current season to be simulated or advanced", () => {
    expect(() => assertCurrentSeasonIsActive("season-1", "season-1")).not.toThrow();
    expect(() => assertCurrentSeasonIsActive("season-1", "season-2")).toThrow(
      "Only the current season can be advanced by the engine",
    );
  });

  it("supports only the active engine phases for simulation and rollover", () => {
    expect(assertSeasonCanSimulate(SeasonPhase.REGULAR_SEASON)).toBe(true);
    expect(assertSeasonCanSimulate(SeasonPhase.PLAYOFFS)).toBe(true);
    expect(assertSeasonCanSimulate(SeasonPhase.OFFSEASON)).toBe(false);
    expect(() => assertSeasonCanSimulate(SeasonPhase.PRESEASON)).toThrow(
      "Preseason simulation is not supported by the current engine flow",
    );
    expect(() => assertSeasonCanAdvanceToNextSeason(SeasonPhase.REGULAR_SEASON)).toThrow(
      "The next season can only be created from the offseason state",
    );
  });

  it("rejects week schedules that do not match the current season phase or lock state", () => {
    expect(() =>
      assertWeekMatchesMatchSeasonPhase(
        SeasonPhase.REGULAR_SEASON,
        [
          {
            id: "match-1",
            kind: "PLAYOFF",
            status: MatchStatus.IN_PROGRESS,
          },
        ],
        MatchStatus.IN_PROGRESS,
      ),
    ).toThrow("Regular-season week contains non-regular match");

    expect(() =>
      assertWeekMatchesMatchSeasonPhase(
        SeasonPhase.PLAYOFFS,
        [
          {
            id: "match-2",
            kind: "PLAYOFF",
            status: MatchStatus.SCHEDULED,
          },
        ],
        MatchStatus.IN_PROGRESS,
      ),
    ).toThrow("expected IN_PROGRESS for simulation");
  });

  it("computes explicit season transitions instead of implicit fallthrough", () => {
    expect(
      buildSeasonTransition({
        currentPhase: SeasonPhase.REGULAR_SEASON,
        currentWeek: 3,
        seasonLengthWeeks: 14,
        createdPlayoffs: false,
        createdFinal: false,
        transitionTime: new Date("2026-12-01T00:00:00.000Z"),
      }),
    ).toEqual({
      phase: SeasonPhase.REGULAR_SEASON,
      week: 4,
      endsAt: undefined,
    });

    expect(
      buildSeasonTransition({
        currentPhase: SeasonPhase.REGULAR_SEASON,
        currentWeek: 14,
        seasonLengthWeeks: 14,
        createdPlayoffs: true,
        createdFinal: false,
        transitionTime: new Date("2026-12-01T00:00:00.000Z"),
      }),
    ).toEqual({
      phase: SeasonPhase.PLAYOFFS,
      week: 15,
      endsAt: undefined,
    });

    expect(
      buildSeasonTransition({
        currentPhase: SeasonPhase.PLAYOFFS,
        currentWeek: 16,
        seasonLengthWeeks: 14,
        createdPlayoffs: false,
        createdFinal: false,
        transitionTime: new Date("2026-12-10T00:00:00.000Z"),
      }),
    ).toEqual({
      phase: SeasonPhase.OFFSEASON,
      week: 16,
      endsAt: new Date("2026-12-10T00:00:00.000Z"),
    });
  });

  it("keeps repeated regular-season transitions monotonic across multiple weeks", () => {
    let week = 1;
    let phase: SeasonPhase = SeasonPhase.REGULAR_SEASON;

    for (let index = 0; index < 5; index += 1) {
      const transition = buildSeasonTransition({
        currentPhase: phase,
        currentWeek: week,
        seasonLengthWeeks: 6,
        createdPlayoffs: false,
        createdFinal: false,
        transitionTime: new Date("2026-12-01T00:00:00.000Z"),
      });

      expect(transition.phase).toBe(SeasonPhase.REGULAR_SEASON);
      expect(transition.week).toBe(week + 1);
      expect(transition.endsAt).toBeUndefined();
      phase = transition.phase;
      week = transition.week;
    }

    const finalTransition = buildSeasonTransition({
      currentPhase: phase,
      currentWeek: week,
      seasonLengthWeeks: 6,
      createdPlayoffs: false,
      createdFinal: false,
      transitionTime: new Date("2026-12-08T00:00:00.000Z"),
    });

    expect(finalTransition).toEqual({
      phase: SeasonPhase.OFFSEASON,
      week: 6,
      endsAt: new Date("2026-12-08T00:00:00.000Z"),
    });
  });

  it("rejects invalid week counters before producing season state", () => {
    expect(() =>
      buildSeasonTransition({
        currentPhase: SeasonPhase.REGULAR_SEASON,
        currentWeek: 0,
        seasonLengthWeeks: 14,
        createdPlayoffs: false,
        createdFinal: false,
        transitionTime: new Date("2026-12-01T00:00:00.000Z"),
      }),
    ).toThrow("Season transition requires a positive current week");

    expect(() =>
      buildSeasonTransition({
        currentPhase: SeasonPhase.REGULAR_SEASON,
        currentWeek: 1,
        seasonLengthWeeks: 0,
        createdPlayoffs: false,
        createdFinal: false,
        transitionTime: new Date("2026-12-01T00:00:00.000Z"),
      }),
    ).toThrow("Season transition requires a positive season length");
  });

  it("requires decisive winners instead of using home-team >= fallbacks", () => {
    expect(
      resolveDecisiveWinnerTeamId({
        homeTeamId: "home",
        awayTeamId: "away",
        homeScore: 24,
        awayScore: 21,
      }),
    ).toBe("home");
    expect(
      resolveDecisiveWinnerTeamId({
        homeTeamId: "home",
        awayTeamId: "away",
        homeScore: 17,
        awayScore: 17,
      }),
    ).toBeNull();
  });
});
