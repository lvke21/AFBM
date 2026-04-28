import { SeasonPhase } from "@/modules/shared/domain/enums";

export function updateSeasonProgression(currentWeek: number, seasonLengthWeeks: number) {
  const isFinalWeek = currentWeek >= seasonLengthWeeks;

  return {
    isFinalWeek,
    nextPhase: isFinalWeek ? SeasonPhase.OFFSEASON : SeasonPhase.REGULAR_SEASON,
    nextWeek: isFinalWeek ? currentWeek : currentWeek + 1,
  };
}
