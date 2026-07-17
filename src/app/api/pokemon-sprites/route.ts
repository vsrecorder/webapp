import { NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

async function getPokemonSprites(): Promise<PokemonSpriteType[]> {
  return await fetchUpstream<PokemonSpriteType[]>(
    upstreamUrl`/api/v1beta/pokemon-sprites`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
}

export async function GET() {
  try {
    const sprites = await getPokemonSprites();

    return NextResponse.json(sprites, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
