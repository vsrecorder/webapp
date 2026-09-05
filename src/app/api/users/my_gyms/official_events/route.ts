import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { UserGymOfficialEventGetResponseType } from "@app/types/user_gym";

import { requireUpstreamToken } from "@app/utils/upstreamToken";

// Myジムの公式イベント一覧。期間(start_date / end_date)の検証と上限は上流に一元化する。
export async function GET(request: NextRequest) {
  const { token, response } = await requireUpstreamToken();
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);

    const params = new URLSearchParams();
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const events = await fetchUpstream<UserGymOfficialEventGetResponseType>(
      upstreamUrl`/api/v1beta/users/my_gyms/official_events?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      },
    );

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
