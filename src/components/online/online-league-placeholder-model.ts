import type { OnlineLeagueDetailState } from "./online-league-detail-model";

export type OnlineReadyGuidanceItem = {
  completed: boolean;
  label: string;
  statusLabel: string;
};

export function getOnlineReadyGuidanceItems(
  detailState: Extract<OnlineLeagueDetailState, { status: "found" }>,
  isFirebaseMvpMode: boolean,
): OnlineReadyGuidanceItem[] {
  const teamStepCompleted =
    detailState.firstSteps.items.find((step) => step.id === "team")?.completed ?? false;
  const trainingStepCompleted =
    detailState.firstSteps.items.find((step) => step.id === "training")?.completed ?? false;
  const optionalPlanningCompleted =
    Boolean(detailState.roster?.depthChart.length) || Boolean(detailState.franchise);

  return [
    {
      label: "Team geprüft",
      completed: teamStepCompleted,
      statusLabel: teamStepCompleted ? "Erledigt" : "Empfohlen",
    },
    {
      label: "Training geprüft",
      completed: isFirebaseMvpMode || trainingStepCompleted,
      statusLabel: isFirebaseMvpMode
        ? "Auto-Default aktiv"
        : trainingStepCompleted
          ? "Erledigt"
          : "Empfohlen",
    },
    {
      label: "Strategie/Depth Chart optional geprüft",
      completed: optionalPlanningCompleted,
      statusLabel: optionalPlanningCompleted ? "Geprüft" : "Optional",
    },
  ];
}
