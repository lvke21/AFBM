import { OnlineAuthGate } from "@/components/auth/online-auth-gate";
import { OnlineLeagueAppShell } from "@/components/online/online-league-app-shell";
import { OnlineLeagueComingSoonPage } from "@/components/online/online-league-coming-soon-page";

type OnlineComingSoonPageProps = {
  params: Promise<{
    feature: string;
    leagueId: string;
  }>;
};

export default async function OnlineComingSoonPage({ params }: OnlineComingSoonPageProps) {
  const { feature, leagueId } = await params;

  return (
    <OnlineLeagueAppShell leagueId={leagueId}>
      <OnlineAuthGate>
        <OnlineLeagueComingSoonPage feature={feature} leagueId={leagueId} />
      </OnlineAuthGate>
    </OnlineLeagueAppShell>
  );
}
