import { NextResponse } from "next/server";

import {
  AuthenticationError,
  requireApiUserId,
} from "@/lib/auth/session";
import {
  deleteSaveGame,
  isSaveGameDeletionUnavailableError,
  isSaveGameNotFoundError,
  saveGameDeletionErrorMessage,
} from "@/modules/savegames/application/savegame-command.service";
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

export async function DELETE(_: Request, context: SaveGameRouteContext) {
  try {
    const { savegameId } = await context.params;
    const userId = await requireApiUserId();
    const result = await deleteSaveGame({
      saveGameId: savegameId,
      userId,
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (isSaveGameNotFoundError(error)) {
      return NextResponse.json({ message: saveGameDeletionErrorMessage(error) }, { status: 404 });
    }

    if (isSaveGameDeletionUnavailableError(error)) {
      return NextResponse.json({ message: saveGameDeletionErrorMessage(error) }, { status: 409 });
    }

    throw error;
  }
}
