import { NextResponse } from "next/server";

import { getDriveLog } from "@/modules/seasons/infrastructure/simulation/simulation-api.service";

import { readRequiredGameIdFromUrl, simulationApiErrorResponse } from "../route-utils";

export async function GET(request: Request) {
  try {
    const gameId = readRequiredGameIdFromUrl(request);

    return NextResponse.json(getDriveLog(gameId));
  } catch (error) {
    return simulationApiErrorResponse(error);
  }
}
