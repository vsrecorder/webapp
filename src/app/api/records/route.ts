import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { fetchUpstream, upstreamErrorResponse } from "@app/utils/upstream";

import {
  RecordGetResponseType,
  RecordCreateRequestType,
  RecordCreateResponseType,
} from "@app/types/record";

import * as jwt from "jsonwebtoken";

async function getRecords(
  token: string,
  event_type: string,
  deck_id: string,
  cursor: string,
): Promise<RecordGetResponseType> {
  const domain = process.env.VSRECORDER_DOMAIN;

  return await fetchUpstream<RecordGetResponseType>(
    `https://${domain}/api/v1beta/records?event_type=${event_type}&deck_id=${deck_id}&cursor=${cursor}`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    },
  );
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
    iss: "vsrecorder-webapp",
    uid: session.user.id,
  };
  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  try {
    const { searchParams } = new URL(request.url);
    const deck_id = searchParams.get("deck_id") ?? "";
    const event_type = searchParams.get("event_type") ?? "";
    const cursor = searchParams.get("cursor") ?? "";

    const records = await getRecords(token, event_type, deck_id, cursor);

    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
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
    iss: "vsrecorder-webapp",
    uid: session.user.id,
  };
  const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

  try {
    const domain = process.env.VSRECORDER_DOMAIN;

    const record: RecordCreateRequestType = await request.json();

    const created = await fetchUpstream<RecordCreateResponseType>(
      `https://${domain}/api/v1beta/records`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      },
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
