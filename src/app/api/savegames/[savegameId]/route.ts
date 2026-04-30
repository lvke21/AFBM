import { NextResponse } from "next/server";

import {
  AuthenticationError,
  requireApiUserId,
} from "@/lib/auth/session";
import { getSaveGameDetail } from "@/modules/savegames/application/savegame-query.service";

type SaveGameRouteContext = {
  params: Promise<{
    savegameId: string;
  }>;
};

export async function GET(_: Request, context: SaveGameRouteContext) {
  try {
    const { savegameId } = await context.params;
    const userId = await requireApiUserId();
    const saveGame = await getSaveGameDetail(userId, savegameId);

    if (!saveGame) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(saveGame);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
