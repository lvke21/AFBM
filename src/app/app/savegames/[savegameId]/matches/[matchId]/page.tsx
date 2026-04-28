import { redirect } from "next/navigation";

type MatchPageProps = {
  params: Promise<{
    savegameId: string;
    matchId: string;
  }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { savegameId, matchId } = await params;

  redirect(`/app/savegames/${savegameId}/game/report?matchId=${encodeURIComponent(matchId)}`);
}
