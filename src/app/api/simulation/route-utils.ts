import { NextResponse } from "next/server";

import { SimulationApiError } from "@/modules/seasons/application/simulation/simulation-api.service";

export function simulationApiErrorResponse(error: unknown) {
  if (error instanceof SimulationApiError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
      },
      { status: error.statusCode },
    );
  }

  throw error;
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new SimulationApiError("Invalid JSON body", 400, "INVALID_JSON");
  }
}

export function readRequiredGameIdFromUrl(request: Request) {
  const gameId = new URL(request.url).searchParams.get("gameId");

  if (!gameId) {
    throw new SimulationApiError("Missing gameId query parameter", 400, "MISSING_GAME_ID");
  }

  return gameId;
}
