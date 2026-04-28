export type OnboardingStepId = "team" | "depth-chart" | "inbox" | "game-start";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  body: string;
  actionLabel: string;
  href: string | null;
  targetKey: string;
};

export type OnboardingContextInput = {
  nextGameHref?: string | null;
  saveGameId: string | null | undefined;
};

export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  "team",
  "depth-chart",
  "inbox",
  "game-start",
];

export function onboardingStorageKey(saveGameId: string) {
  return `afbm:onboarding:v1:${saveGameId}`;
}

export function buildOnboardingSteps({
  nextGameHref,
  saveGameId,
}: OnboardingContextInput): OnboardingStep[] {
  if (!saveGameId) {
    return [];
  }

  const base = `/app/savegames/${saveGameId}`;

  return [
    {
      id: "team",
      title: "Ueberpruefe dein Team",
      body:
        "Starte mit dem Kader. Achte auf Position, Rolle und Overall, damit du verstehst, womit du in Woche 1 arbeitest.",
      actionLabel: "Roster ansehen",
      href: `${base}/team/roster`,
      targetKey: "roster",
    },
    {
      id: "depth-chart",
      title: "Setze deine Starter",
      body:
        "Im Depth Chart legst du fest, wer Slot 1 bekommt. Diese Entscheidung bestimmt, welche Spieler zuerst eingesetzt werden.",
      actionLabel: "Depth Chart oeffnen",
      href: `${base}/team/depth-chart`,
      targetKey: "depth-chart",
    },
    {
      id: "inbox",
      title: "Behebe eine Warnung",
      body:
        "Die Inbox zeigt dir, was vor dem Spiel Aufmerksamkeit braucht. Oeffne sie und pruefe den wichtigsten Hinweis.",
      actionLabel: "Inbox oeffnen",
      href: `${base}/inbox`,
      targetKey: "inbox",
    },
    {
      id: "game-start",
      title: "Starte dein erstes Spiel",
      body:
        "Wenn die Woche bereit ist, fuehrt dich das Game Setup zum Kickoff. Pruefe den Status und starte das Match.",
      actionLabel: "Spiel vorbereiten",
      href: nextGameHref ?? `${base}/game/setup`,
      targetKey: "game-start",
    },
  ];
}

export function routeStepId(pathname: string): OnboardingStepId | null {
  if (pathname.includes("/team/depth-chart")) {
    return "depth-chart";
  }

  if (pathname.includes("/team/roster") || pathname.endsWith("/team")) {
    return "team";
  }

  if (pathname.includes("/inbox")) {
    return "inbox";
  }

  if (pathname.includes("/game/setup") || pathname.includes("/game/live")) {
    return "game-start";
  }

  if (pathname.includes("/game/report")) {
    return "game-start";
  }

  return null;
}

export function nextOnboardingStep(
  steps: OnboardingStep[],
  completedStepIds: Iterable<string>,
): OnboardingStep | null {
  const completed = new Set(completedStepIds);

  return steps.find((step) => !completed.has(step.id)) ?? null;
}

export function mergeCompletedOnboardingSteps(
  completedStepIds: Iterable<string>,
  routeStep: OnboardingStepId | null,
) {
  const completed = new Set(completedStepIds);

  if (!routeStep) {
    return completed;
  }

  const routeIndex = ONBOARDING_STEP_ORDER.indexOf(routeStep);

  if (routeIndex === -1) {
    return completed;
  }

  for (const stepId of ONBOARDING_STEP_ORDER.slice(0, routeIndex + 1)) {
    completed.add(stepId);
  }

  return completed;
}

export function isOnboardingComplete(completedStepIds: Iterable<string>) {
  const completed = new Set(completedStepIds);

  return ONBOARDING_STEP_ORDER.every((stepId) => completed.has(stepId));
}
