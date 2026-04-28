import { NextResponse } from "next/server";

import { getStats } from "@/modules/seasons/application/simulation/simulation-api.service";

import { readRequiredGameIdFromUrl, simulationApiErrorResponse } from "../route-utils";

export async function GET(request: Request) {
  try {
    const gameId = readRequiredGameIdFromUrl(request);

    return NextResponse.json(getStats(gameId));
  } catch (error) {
    return simulationApiErrorResponse(error);
  }
}
