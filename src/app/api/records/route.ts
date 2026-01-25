import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import { RecordGetResponseType, RecordCreateRequestType } from "@app/types/record";

import * as jwt from "jsonwebtoken";

async function getRecords(
  token: string,
  event_type: string,
  cursor: string,
): Promise<RecordGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  try {
    const res = await fetch(
      `https://${domain}/api/v1beta/records?event_type=${event_type}&cursor=${cursor}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    const ret: RecordGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    const { searchParams } = new URL(request.url);
    const event_type = searchParams.get("event_type") ?? "";
    const cursor = searchParams.get("cursor") ?? "";

    const ret = await getRecords(token, event_type, cursor);

    return NextResponse.json(ret, { status: 200 });
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    const domain = process.env.VSRECORDER_DOMAIN;

    const record: RecordCreateRequestType = await request.json();

    const res = await fetch(`https://${domain}/api/v1beta/records`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });

    if (res.status == 201) {
      const ret = await res.json();

      return NextResponse.json(ret, { status: 201 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
