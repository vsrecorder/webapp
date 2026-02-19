import { NextResponse } from "next/server";

import { PokemonSpriteType } from "@app/types/pokemon_sprite";

async function getPokemonSprites(): Promise<PokemonSpriteType[]> {
  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const res = await fetch(`https://${domain}/api/v1beta/pokemon-sprites`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: PokemonSpriteType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET() {
  try {
    const ret = await getPokemonSprites();

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}
