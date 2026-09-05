import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

/*
 * 登録時アンケート「どこでバトレコを知りましたか？」(施策0-4 S4)の BFF。
 * activity/route.ts と同じ型: セッション確認 → 10秒 JWT を署名 → core-apiserver へ中継。
 *
 * 回答の allowlist はここでは検証しない。選択肢を増やすたびに BFF も直すことになるため、
 * 妥当性の判断は core-apiserver 側(entity.NormalizeAcquisitionSurveyAnswer)に一元化する。
 */

type SurveyRequest = {
  answer?: unknown;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SurveyRequest | null;
  if (!body || typeof body.answer !== "string" || !body.answer) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const token = signUpstreamToken(session.user.id);

  const res = await fetch(upstreamUrl`/api/v1beta/users/acquisition/survey`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answer: body.answer }),
  });

  // 204 No Content で返るためJSONボディはパースしない
  return new NextResponse(null, { status: res.status });
}
