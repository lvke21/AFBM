import CanonicalTeamSchemesPage from "../schemes/page";
import {
  type CanonicalTeamRoutePageProps,
} from "../team-route-data";

export default async function CanonicalTeamGameplanPage({
  params,
}: CanonicalTeamRoutePageProps) {
  return CanonicalTeamSchemesPage({ params });
}
