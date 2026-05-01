import { NextResponse } from "next/server";

import { simulateGame } from "@/modules/seasons/infrastructure/simulation/simulation-api.service";

import { readJsonBody, simulationApiErrorResponse } from "../route-utils";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);

    return NextResponse.json(simulateGame(body.gameId));
  } catch (error) {
    return simulationApiErrorResponse(error);
  }
}
