import { OnlineAuthGate } from "@/components/auth/online-auth-gate";
import { OnlineLeaguePlaceholder } from "@/components/online/online-league-placeholder";

type OnlineLeaguePageProps = {
  params: Promise<{
    leagueId: string;
  }>;
};

export default async function OnlineLeaguePage({ params }: OnlineLeaguePageProps) {
  const { leagueId } = await params;

  return (
    <main className="min-h-screen bg-[#07111d] text-white">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%),radial-gradient(circle_at_top_left,rgba(61,220,151,0.14),transparent_30%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl items-center">
          <OnlineAuthGate>
            <OnlineLeaguePlaceholder leagueId={leagueId} />
          </OnlineAuthGate>
        </div>
      </div>
    </main>
  );
}
