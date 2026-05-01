import { OnlineAuthGate } from "@/components/auth/online-auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { OnlineLeagueDraftPage } from "@/components/online/online-league-draft-page";

type OnlineDraftPageProps = {
  params: Promise<{
    leagueId: string;
  }>;
};

export default async function OnlineDraftPage({ params }: OnlineDraftPageProps) {
  const { leagueId } = await params;

  return (
    <AppShell
      context={{
        saveGame: {
          id: leagueId,
          name: "Online Multiplayer",
          leagueName: "AFBM Online",
        },
        baseHref: `/online/league/${leagueId}`,
        currentSeason: null,
        managerTeam: null,
      }}
    >
      <OnlineAuthGate>
        <OnlineLeagueDraftPage leagueId={leagueId} />
      </OnlineAuthGate>
    </AppShell>
  );
}
