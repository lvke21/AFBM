import { redirect } from "next/navigation";

import { OnlineAuthGate } from "@/components/auth/online-auth-gate";
import { OnlineLeagueAppShell } from "@/components/online/online-league-app-shell";
import {
  getOnlineLeagueRouteFallbackHref,
  resolveOnlineLeagueRouteFallback,
} from "@/components/online/online-league-route-fallback-model";
import { OnlineLeagueRouteFallbackPage } from "@/components/online/online-league-route-fallback-page";

type OnlineLeagueFallbackPageProps = {
  params: Promise<{
    leagueId: string;
    section: string[];
  }>;
};

export default async function OnlineLeagueFallbackPage({
  params,
}: OnlineLeagueFallbackPageProps) {
  const { leagueId, section } = await params;
  const resolution = resolveOnlineLeagueRouteFallback(section);

  if (resolution.type !== "unknown") {
    redirect(getOnlineLeagueRouteFallbackHref(leagueId, resolution));
  }

  return (
    <OnlineLeagueAppShell leagueId={leagueId}>
      <OnlineAuthGate>
        <OnlineLeagueRouteFallbackPage leagueId={leagueId} resolution={resolution} />
      </OnlineAuthGate>
    </OnlineLeagueAppShell>
  );
}
