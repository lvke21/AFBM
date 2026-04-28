import {
  buildContractOffer,
  evaluateFreeAgentOffer,
  getExpectedFreeAgentSalary,
} from "@/modules/teams/domain/contract-calculation";
import type { FreeAgentMarketPlayer } from "@/modules/teams/application/team-management.shared";
import { buildPlayerValue } from "@/components/player/player-value-model";

export type FreeAgentSortKey = "need" | "fit" | "overall" | "value";

export function sortFreeAgents(players: FreeAgentMarketPlayer[], sortKey: FreeAgentSortKey) {
  return [...players].sort((left, right) => {
    if (sortKey === "value") {
      const leftValue = buildPlayerValue({
        ...left,
        capHit: left.projectedCapHit,
      });
      const rightValue = buildPlayerValue({
        ...right,
        capHit: right.projectedCapHit,
      });

      if (rightValue.score !== leftValue.score) {
        return rightValue.score - leftValue.score;
      }

      if (right.teamNeedScore !== left.teamNeedScore) {
        return right.teamNeedScore - left.teamNeedScore;
      }
    } else if (sortKey === "fit") {
      if ((right.schemeFitScore ?? 0) !== (left.schemeFitScore ?? 0)) {
        return (right.schemeFitScore ?? 0) - (left.schemeFitScore ?? 0);
      }

      if (right.teamNeedScore !== left.teamNeedScore) {
        return right.teamNeedScore - left.teamNeedScore;
      }
    } else if (sortKey === "overall") {
      if (right.positionOverall !== left.positionOverall) {
        return right.positionOverall - left.positionOverall;
      }

      if ((right.schemeFitScore ?? 0) !== (left.schemeFitScore ?? 0)) {
        return (right.schemeFitScore ?? 0) - (left.schemeFitScore ?? 0);
      }
    } else {
      if (right.teamNeedScore !== left.teamNeedScore) {
        return right.teamNeedScore - left.teamNeedScore;
      }

      if ((right.schemeFitScore ?? 0) !== (left.schemeFitScore ?? 0)) {
        return (right.schemeFitScore ?? 0) - (left.schemeFitScore ?? 0);
      }
    }

    if (right.positionOverall !== left.positionOverall) {
      return right.positionOverall - left.positionOverall;
    }

    return left.age - right.age;
  });
}

export function buildFreeAgentOfferPreview(input: {
  capSpace: number;
  cashBalance: number;
  player: Pick<
    FreeAgentMarketPlayer,
    | "age"
    | "positionOverall"
    | "potentialRating"
    | "projectedCapHit"
    | "schemeFitScore"
    | "teamNeedScore"
  >;
  yearlySalary: number;
  years: number;
}) {
  const offer = buildContractOffer({
    positionOverall: input.player.positionOverall,
    yearlySalary: input.yearlySalary,
    years: input.years,
  });

  return {
    ...offer,
    capImpact: -offer.capHit,
    cashImpact: -offer.signingBonus,
    canAffordCap: offer.capHit <= input.capSpace,
    canAffordCash: offer.signingBonus <= input.cashBalance,
    capAfterSigning: input.capSpace - offer.capHit,
    cashAfterSigning: input.cashBalance - offer.signingBonus,
    evaluation: evaluateFreeAgentOffer({
      positionOverall: input.player.positionOverall,
      schemeFitScore: input.player.schemeFitScore,
      teamNeedScore: input.player.teamNeedScore,
      yearlySalary: input.yearlySalary,
      years: input.years,
    }),
    expectedSalary: getExpectedFreeAgentSalary(input.player.positionOverall),
    value: buildPlayerValue({
      ...input.player,
      capHit: offer.capHit,
    }),
  };
}

export function getDefaultOffer(player: Pick<FreeAgentMarketPlayer, "positionOverall">) {
  return {
    years: 2,
    yearlySalary: Math.max(850_000, player.positionOverall * 120_000),
  };
}
