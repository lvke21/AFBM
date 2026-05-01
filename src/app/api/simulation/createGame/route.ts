import { NextResponse } from "next/server";

import { createGame } from "@/modules/seasons/infrastructure/simulation/simulation-api.service";

import { readJsonBody, simulationApiErrorResponse } from "../route-utils";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);

    return NextResponse.json(createGame(body), { status: 201 });
  } catch (error) {
    return simulationApiErrorResponse(error);
  }
}
