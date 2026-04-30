import { NextResponse } from "next/server";

import {
  AuthenticationError,
  requireApiUserId,
} from "@/lib/auth/session";
import { getTeamDetailForUser } from "@/modules/teams/application/team-query.service";

type TeamRouteContext = {
  params: Promise<{
    savegameId: string;
    teamId: string;
  }>;
};

export async function GET(_: Request, context: TeamRouteContext) {
  try {
    const { savegameId, teamId } = await context.params;
    const userId = await requireApiUserId();
    const team = await getTeamDetailForUser(userId, savegameId, teamId);

    if (!team) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    throw error;
  }
}
