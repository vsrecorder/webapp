import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import * as jwt from "jsonwebtoken";

type DeckCode = {
  id: string;
  created_at: Date;
  user_id: string;
  deck_id: string;
  code: string;
  private_code_flg: boolean;
};

type DeckData = {
  id: string;
  created_at: Date;
  archived_at: Date;
  user_id: string;
  name: string;
  code: string;
  private_code_flg: boolean;
  private_flg: boolean;
  latest_deck_code: DeckCode;
};

type Deck = {
  cursor: string;
  data: DeckData;
};

type DeckGetResponseType = {
  limit: number;
  offset: number;
  cursor: string;
  decks: Deck[];
};

type DeckCreateRequestType = {
  name: string;
  code: string;
  private_code_flg: boolean;
};

async function getDecks(): Promise<DeckGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  try {
    const res = await fetch(`https://` + domain + `/api/v1beta/decks?limit=50`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: DeckGetResponseType = await res.json();
    return ret;
  } catch (error) {
    throw error;
  }
}

async function getDecksWithAuth(token: string): Promise<DeckGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  try {
    const res = await fetch(`https://` + domain + `/api/v1beta/decks?limit=50`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    });

    const ret: DeckGetResponseType = await res.json();
    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET() {
  const session = await auth();
  if (!session) {
    try {
      const decks = await getDecks();
      return NextResponse.json(decks, { status: 200 });
    } catch (error) {
      throw error;
    }
  }

  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;

  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };

  const jwtPayload = {
    iss: "vsrecorder-web",
    uid: session.user.id,
  };

  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  try {
    const decks = await getDecksWithAuth(token);
    return NextResponse.json(decks, { status: 200 });
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const deck: DeckCreateRequestType = await request.json();

  const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;
  const jwtSignOptions: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "10s",
  };
  const jwtPayload = {
    iss: "vsrecorder-web",
    uid: session.user.id,
  };
  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  const domain = process.env.VSRECORDER_DOMAIN;

  try {
    const res = await fetch(`https://` + domain + `/api/v1beta/decks`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deck),
    });

    if (res.status == 201) {
      const ret: DeckData = await res.json();
      return NextResponse.json(ret, { status: 201 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
