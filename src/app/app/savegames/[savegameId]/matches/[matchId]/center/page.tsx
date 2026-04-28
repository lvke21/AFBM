import { redirect } from "next/navigation";

type GameCenterPageProps = {
  params: Promise<{
    savegameId: string;
    matchId: string;
  }>;
};

export default async function GameCenterPage({ params }: GameCenterPageProps) {
  const { savegameId, matchId } = await params;

  redirect(`/app/savegames/${savegameId}/game/live?matchId=${encodeURIComponent(matchId)}`);
}
