import { NextResponse } from "next/server";

import {
  AuthenticationError,
  requireApiUserId,
} from "@/lib/auth/session";
import {
  createSaveGame,
  getOfflineSaveGameDeleteAvailability,
  isSaveGameCreationUnavailableError,
  saveGameCreationErrorMessage,
} from "@/modules/savegames/application/savegame-command.service";
import { listSaveGames } from "@/modules/savegames/application/savegame-query.service";

export async function GET() {
  try {
    const userId = await requireApiUserId();
    const saveGames = await listSaveGames(userId);

    return NextResponse.json({
      items: saveGames,
      capabilities: {
        deleteSaveGame: getOfflineSaveGameDeleteAvailability(),
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireApiUserId();
    const body = (await request.json()) as {
      name?: string;
      managerTeamAbbreviation?: string;
    };

    const saveGame = await createSaveGame({
      userId,
      name: body.name ?? "",
      managerTeamAbbreviation: body.managerTeamAbbreviation,
    });

    return NextResponse.json(saveGame, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (isSaveGameCreationUnavailableError(error)) {
      return NextResponse.json({ message: saveGameCreationErrorMessage(error) }, { status: 409 });
    }

    throw error;
  }
}
