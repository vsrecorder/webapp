import { NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

async function getPokemonSprites(): Promise<PokemonSpriteType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<PokemonSpriteType[]>(
    `https://${domain}/api/v1beta/pokemon-sprites`,
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
