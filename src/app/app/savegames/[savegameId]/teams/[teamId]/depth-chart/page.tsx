import { redirect } from "next/navigation";

import type { TeamRoutePageProps } from "../team-page-data";

export default async function LegacyTeamDepthChartPage({ params }: TeamRoutePageProps) {
  const { savegameId } = await params;

  redirect(`/app/savegames/${savegameId}/team/depth-chart`);
}
