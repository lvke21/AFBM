import type {
  FranchiseStrategyProfile,
  OnlineContractPlayer,
  PlayerContract,
  SalaryCap,
} from "./online-league-types";

export function getCapSpace(cap: SalaryCap) {
  return cap.availableCap;
}

export function getStrategyCapLimit(
  cap: SalaryCap,
  strategy: FranchiseStrategyProfile,
) {
  return strategy.strategyType === "win_now" && strategy.financialRiskTolerance >= 80
    ? cap.softBufferLimit
    : cap.capLimit;
}

export function hasStrategyCapSpace(
  cap: SalaryCap,
  strategy: FranchiseStrategyProfile,
) {
  return cap.currentCapUsage <= getStrategyCapLimit(cap, strategy);
}

export function getStrategyContractBlockReason(
  strategy: FranchiseStrategyProfile,
  player: OnlineContractPlayer,
  contract: PlayerContract,
) {
  if (
    strategy.strategyType === "rebuild" &&
    (contract.contractType === "star" || player.age >= 30) &&
    player.potential < 95
  ) {
    return "Signing blockiert: Rebuild-Strategie priorisiert junge Assets statt teurer Kurzzeitlösungen.";
  }

  if (
    strategy.strategyType === "youth_focus" &&
    (player.age > 27 || contract.contractType === "star") &&
    player.potential < 95
  ) {
    return "Signing blockiert: Youth Focus erlaubt nur junge Kernspieler oder außergewöhnliches Potenzial.";
  }

  return null;
}
