import { OnlineAuthGate } from "@/components/auth/online-auth-gate";
import { OnlineLeagueAppShell } from "@/components/online/online-league-app-shell";
import { OnlineLeaguePlaceholder } from "@/components/online/online-league-placeholder";

type OnlineLeaguePageProps = {
  params: Promise<{
    leagueId: string;
  }>;
};

export default async function OnlineLeaguePage({ params }: OnlineLeaguePageProps) {
  const { leagueId } = await params;

  return (
    <OnlineLeagueAppShell leagueId={leagueId}>
      <OnlineAuthGate>
        <OnlineLeaguePlaceholder leagueId={leagueId} />
      </OnlineAuthGate>
    </OnlineLeagueAppShell>
  );
}
