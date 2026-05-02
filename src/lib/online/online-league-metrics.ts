import type { FanMoodTier, TeamChemistryTier } from "./online-league-types";

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getTeamChemistryTier(score: number): TeamChemistryTier {
  const chemistry = clampScore(score);

  if (chemistry >= 85) {
    return "elite";
  }
  if (chemistry >= 70) {
    return "connected";
  }
  if (chemistry >= 50) {
    return "neutral";
  }
  if (chemistry >= 30) {
    return "unstable";
  }

  return "fractured";
}

export function calculateTeamChemistryGameplayModifier(score: number) {
  const normalized = clampScore(score);
  const rawModifier = (normalized - 50) / 500;

  return Math.round(Math.max(-0.08, Math.min(0.08, rawModifier)) * 1000) / 1000;
}

export function getFanMoodTier(fanMood: number): FanMoodTier {
  const mood = clampScore(fanMood);

  if (mood >= 90) {
    return "ecstatic";
  }
  if (mood >= 75) {
    return "excited";
  }
  if (mood >= 60) {
    return "positive";
  }
  if (mood >= 45) {
    return "neutral";
  }
  if (mood >= 30) {
    return "frustrated";
  }
  if (mood >= 15) {
    return "angry";
  }

  return "hostile";
}
