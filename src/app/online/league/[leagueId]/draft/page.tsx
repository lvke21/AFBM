import { OnlineAuthGate } from "@/components/auth/online-auth-gate";
import { OnlineLeagueAppShell } from "@/components/online/online-league-app-shell";
import { OnlineLeagueDraftPage } from "@/components/online/online-league-draft-page";

type OnlineDraftPageProps = {
  params: Promise<{
    leagueId: string;
  }>;
};

export default async function OnlineDraftPage({ params }: OnlineDraftPageProps) {
  const { leagueId } = await params;

  return (
    <OnlineLeagueAppShell leagueId={leagueId}>
      <OnlineAuthGate>
        <OnlineLeagueDraftPage leagueId={leagueId} />
      </OnlineAuthGate>
    </OnlineLeagueAppShell>
  );
}
