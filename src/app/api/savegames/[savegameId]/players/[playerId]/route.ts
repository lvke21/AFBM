import { NextResponse } from "next/server";

import {
  AuthenticationError,
  requireApiUserId,
} from "@/lib/auth/session";
import { getPlayerDetailForUser } from "@/modules/players/application/player-query.service";

type PlayerRouteContext = {
  params: Promise<{
    savegameId: string;
    playerId: string;
  }>;
};

export async function GET(_: Request, context: PlayerRouteContext) {
  try {
    const { savegameId, playerId } = await context.params;
    const userId = await requireApiUserId();
    const player = await getPlayerDetailForUser(userId, savegameId, playerId);

    if (!player) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
