import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/(default)/auth";

import {
  RecordCreateRequestType,
  RecordCreateResponseType,
} from "@app/(default)/types/record";

import * as jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const record: RecordCreateRequestType = await request.json();

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
    const res = await fetch(`https://` + domain + `/api/v1beta/records`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });

    if (res.status == 201) {
      const ret: RecordCreateResponseType = await res.json();
      return NextResponse.json(ret, { status: 201 });
    } else {
      return res;
    }
  } catch (error) {
    throw error;
  }
}
