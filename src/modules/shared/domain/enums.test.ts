import {
  DraftClassStatus as PrismaDraftClassStatus,
  DraftPlayerStatus as PrismaDraftPlayerStatus,
  DraftRiskLevel as PrismaDraftRiskLevel,
  DevelopmentTrait as PrismaDevelopmentTrait,
  DominantHand as PrismaDominantHand,
  ContractStatus as PrismaContractStatus,
  InboxTaskPriority as PrismaInboxTaskPriority,
  InboxTaskStatus as PrismaInboxTaskStatus,
  InjuryStatus as PrismaInjuryStatus,
  MatchKind as PrismaMatchKind,
  MatchStatus as PrismaMatchStatus,
  PlayerHistoryEventType as PrismaPlayerHistoryEventType,
  PlayerStatus as PrismaPlayerStatus,
  RosterStatus as PrismaRosterStatus,
  ScoutingLevel as PrismaScoutingLevel,
  SeasonPhase as PrismaSeasonPhase,
  TeamFinanceEventType as PrismaTeamFinanceEventType,
  WeekState as PrismaWeekState,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  ContractStatus,
  DraftClassStatus,
  DraftPlayerStatus,
  DraftRiskLevel,
  DevelopmentTrait,
  DominantHand,
  InboxTaskPriority,
  InboxTaskStatus,
  InjuryStatus,
  MatchKind,
  MatchStatus,
  PlayerHistoryEventType,
  PlayerStatus,
  RosterStatus,
  ScoutingLevel,
  SeasonPhase,
  TeamFinanceEventType,
  WeekState,
} from "./enums";

describe("domain enum compatibility", () => {
  it("keeps domain enum values aligned with Prisma persistence values", () => {
    expect(DraftClassStatus).toEqual(PrismaDraftClassStatus);
    expect(DraftPlayerStatus).toEqual(PrismaDraftPlayerStatus);
    expect(DraftRiskLevel).toEqual(PrismaDraftRiskLevel);
    expect(DevelopmentTrait).toEqual(PrismaDevelopmentTrait);
    expect(DominantHand).toEqual(PrismaDominantHand);
    expect(ContractStatus).toEqual(PrismaContractStatus);
    expect(InboxTaskPriority).toEqual(PrismaInboxTaskPriority);
    expect(InboxTaskStatus).toEqual(PrismaInboxTaskStatus);
    expect(InjuryStatus).toEqual(PrismaInjuryStatus);
    expect(MatchKind).toEqual(PrismaMatchKind);
    expect(MatchStatus).toEqual(PrismaMatchStatus);
    expect(PlayerHistoryEventType).toEqual(PrismaPlayerHistoryEventType);
    expect(PlayerStatus).toEqual(PrismaPlayerStatus);
    expect(RosterStatus).toEqual(PrismaRosterStatus);
    expect(ScoutingLevel).toEqual(PrismaScoutingLevel);
    expect(SeasonPhase).toEqual(PrismaSeasonPhase);
    expect(TeamFinanceEventType).toEqual(PrismaTeamFinanceEventType);
    expect(WeekState).toEqual(PrismaWeekState);
  });
});
