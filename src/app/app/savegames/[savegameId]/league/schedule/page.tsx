import SeasonPage from "../../seasons/[seasonId]/page";
import {
  resolveCurrentSeasonRouteParams,
  type CanonicalLeagueRoutePageProps,
} from "../league-route-data";

export default async function CanonicalLeagueSchedulePage({
  params,
}: CanonicalLeagueRoutePageProps) {
  const seasonParams = await resolveCurrentSeasonRouteParams(params);

  return SeasonPage({ params: Promise.resolve(seasonParams) });
}
