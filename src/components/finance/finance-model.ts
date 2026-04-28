import type { TeamDetail } from "@/modules/teams/domain/team.types";
import {
  getCapSummary,
  getContractTableSummary,
  getFinanceEventListState,
} from "@/components/team/team-overview-model";

export type FinanceDecisionTone = "critical" | "warning" | "positive" | "neutral";

export type FinanceDecisionItem = {
  id: string;
  title: string;
  message: string;
  tone: FinanceDecisionTone;
};

export function getFinanceWorkspaceSummary(team: TeamDetail) {
  const capSummary = getCapSummary(team);
  const contractSummary = getContractTableSummary(team.players);
  const eventState = getFinanceEventListState(team.recentFinanceEvents);

  return {
    capSummary,
    contractSummary,
    financeEventCount: eventState.events.length,
  };
}

export function getFinanceProjection(team: TeamDetail) {
  const capSummary = getCapSummary(team);
  const expiringCap = Number(team.contractOutlook.expiringCap);
  const projectedActiveCap = Math.max(0, capSummary.activeCapCommitted - expiringCap);
  const projectedCapSpace = capSummary.salaryCapSpace + expiringCap;
  const projectedUsagePercent =
    capSummary.capLimit > 0
      ? Math.min(100, Math.max(0, Math.round((projectedActiveCap / capSummary.capLimit) * 100)))
      : 0;

  return {
    expiringCap,
    expiringPlayers: team.contractOutlook.expiringPlayers.length,
    projectedActiveCap,
    projectedCapSpace,
    projectedUsagePercent,
  };
}

export function buildFinanceDecisionItems(team: TeamDetail): FinanceDecisionItem[] {
  const items: FinanceDecisionItem[] = [];
  const projection = getFinanceProjection(team);

  if (team.salaryCapSpace < 0) {
    items.push({
      id: "cap-negative",
      title: "Cap ist ueberzogen",
      message: "Roster- und Vertragsentscheidungen sollten zuerst Cap Space freimachen.",
      tone: "critical",
    });
  } else if (team.salaryCapSpace < 5_000_000) {
    items.push({
      id: "cap-tight",
      title: "Cap Space ist knapp",
      message: "Neue Signings sollten nur mit klarer Kaderprioritaet abgeschlossen werden.",
      tone: "warning",
    });
  } else {
    items.push({
      id: "cap-stable",
      title: "Cap Space ist handlungsfaehig",
      message: "Der GM hat genug Spielraum fuer gezielte Kaderbewegungen.",
      tone: "positive",
    });
  }

  if (projection.expiringPlayers > 0) {
    items.push({
      id: "expiring-contracts",
      title: "Auslaufende Vertraege pruefen",
      message: `${projection.expiringPlayers} Spieler laufen aus und koennen ${projection.expiringCap.toLocaleString("de-DE")} USD Cap veraendern.`,
      tone: projection.expiringPlayers >= 5 ? "warning" : "neutral",
    });
  }

  if (team.cashBalance < 5_000_000) {
    items.push({
      id: "cash-tight",
      title: "Cash ist niedrig",
      message: "Signing Bonuses koennen trotz Cap Space blockiert werden.",
      tone: "warning",
    });
  }

  if (team.recentFinanceEvents.length === 0) {
    items.push({
      id: "no-events",
      title: "Keine Finanzhistorie",
      message: "Es gibt noch keine Events, die Cash oder Cap sichtbar veraendert haben.",
      tone: "neutral",
    });
  }

  return items;
}

export function getFinanceEventSummary(events: TeamDetail["recentFinanceEvents"]) {
  const ordered = [...events].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
  const latest = ordered[0] ?? null;

  return {
    eventCount: ordered.length,
    latestEventLabel: latest ? latest.type.replaceAll("_", " ") : "Keine",
    totalCapImpact: ordered.reduce((total, event) => total + event.capImpact, 0),
    totalCashImpact: ordered.reduce((total, event) => total + event.amount, 0),
  };
}
