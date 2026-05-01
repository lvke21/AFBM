import { NextResponse } from "next/server";

import { getGameResult } from "@/modules/seasons/infrastructure/simulation/simulation-api.service";

import { readRequiredGameIdFromUrl, simulationApiErrorResponse } from "../route-utils";

export async function GET(request: Request) {
  try {
    const gameId = readRequiredGameIdFromUrl(request);

    return NextResponse.json(getGameResult(gameId));
  } catch (error) {
    return simulationApiErrorResponse(error);
  }
}
