import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { UserGymCreateResponseType, UserGymGetResponseType } from "@app/types/user_gym";

import { requireUpstreamToken } from "@app/utils/upstreamToken";

// 本人のMyジム一覧。上流は uid をトークンから取るため、パスにユーザIDは載せない。
export async function GET() {
  const { token, response } = await requireUpstreamToken();
  if (response) return response;

  try {
    const userGyms = await fetchUpstream<UserGymGetResponseType>(
      upstreamUrl`/api/v1beta/users/my_gyms`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(userGyms, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}

// Myジムの登録。上限超過(409)・店舗が実在しない(404)の判定は上流に一元化する。
export async function POST(request: NextRequest) {
  const { token, response } = await requireUpstreamToken();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as { shop_id?: unknown } | null;
  if (!body || typeof body.shop_id !== "number" || !Number.isInteger(body.shop_id)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    const userGym = await fetchUpstream<UserGymCreateResponseType>(
      upstreamUrl`/api/v1beta/users/my_gyms`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ shop_id: body.shop_id }),
      },
    );

    return NextResponse.json(userGym, { status: 201 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
