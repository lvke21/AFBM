import { redirect } from "next/navigation";

import type { TeamRoutePageProps } from "../team-page-data";

export default async function TeamFinancePage({ params }: TeamRoutePageProps) {
  const { savegameId } = await params;

  redirect(`/app/savegames/${savegameId}/finance`);
}
