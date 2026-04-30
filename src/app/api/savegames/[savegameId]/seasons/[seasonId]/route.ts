import { NextResponse } from "next/server";

import {
  AuthenticationError,
  requireApiUserId,
} from "@/lib/auth/session";
import { getSeasonOverviewForUser } from "@/modules/seasons/application/season-query.service";

type SeasonRouteContext = {
  params: Promise<{
    savegameId: string;
    seasonId: string;
  }>;
};

export async function GET(_: Request, context: SeasonRouteContext) {
  try {
    const { savegameId, seasonId } = await context.params;
    const userId = await requireApiUserId();
    const season = await getSeasonOverviewForUser(userId, savegameId, seasonId);

    if (!season) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
