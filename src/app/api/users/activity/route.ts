import { NextRequest, NextResponse } from "next/server";

import { auth } from "@app/auth";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

/*
 * 「見る」利用の日次計測ビーコン（USER_DAILY_ACTIVITIES_PLAN.md）。
 *
 * カテゴリの妥当性はここでは検証せず、受け取った配列をそのまま中継する。
 * BFFにホワイトリストを置くと、計測カテゴリを増やすたびにここも直す必要が生まれるため、
 * 既知かどうかの判断はcore-apiserver側のレジストリ（entity.UserDailyActivityCategories）
 * に一元化する。
 */

type ActivityRequest = {
  categories?: unknown;
};

async function recordActivity(token: string, categories: string[]): Promise<Response> {
  return fetch(upstreamUrl`/api/v1beta/users/activity`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categories }),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = signUpstreamToken(session.user.id);

  // bodyが読めなくても計測は落とさない。
  // 空配列で送った場合はcore-apiserver側で visit に丸められる。
  const body = (await request.json().catch(() => ({}))) as ActivityRequest;
  const categories = Array.isArray(body.categories) ? (body.categories as string[]) : [];

  // 計測は204 No Contentで返るためJSONボディはパースしない
  const res = await recordActivity(token, categories);

  return new NextResponse(null, { status: res.status });
}
