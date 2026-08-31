import { NextRequest, NextResponse } from "next/server";

import { fetchUpstream, upstreamErrorResponse, upstreamUrl } from "@app/utils/upstream";

import { ShopGetResponseType } from "@app/types/shop";

/*
 * 店舗検索。Myジムに登録する店舗を選ぶために使う。
 *
 * 店舗マスタは公式サイトが公開している情報なので認証は要求しない
 * (上流 /shops も同じ扱い)。キーワードの検証と件数の上限は
 * 上流に一元化し、ここは中継するだけにする。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = new URLSearchParams();
    const keyword = searchParams.get("keyword");
    const limit = searchParams.get("limit");
    if (keyword) params.set("keyword", keyword);
    if (limit) params.set("limit", limit);

    const shops = await fetchUpstream<ShopGetResponseType>(
      upstreamUrl`/api/v1beta/shops?${params}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );

    return NextResponse.json(shops, { status: 200 });
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
