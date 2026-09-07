import { NextResponse } from "next/server";

import { RegulationType } from "@app/types/regulation";

import { upstreamUrl } from "@app/utils/upstream";

/*
 * レギュレーション(使用可能なカードの範囲)のマスタは、年に数回しか増減しない
 * 全ユーザー共通のデータで、利用者ごとに変わる部分が無い。
 *
 * それにもかかわらず、ブラウザからの取得がそのまま上流へ届いていた
 * (本番の nginx ログ7日ぶんで2,184回、ブラウザと上流が1対1)。記録の作成・編集、
 * 戦績分析、デッキ分析など8つの画面がレギュレーション選択を持つため本数が多い。
 * Data Cache に載せて、上流を叩くのは期間内に1回で済ませる。
 *
 * cache: "force-cache" を明示するのは、no-store と revalidate を併用すると
 * 両方無視されるため(Next.js の fetch の仕様)。
 *
 * 期間は1時間。増減はレギュレーション改訂のタイミングだけで、反映が
 * 多少遅れても画面は壊れない(取得前・失敗時は FALLBACK_REGULATIONS を使う)。
 */
const REVALIDATE_SECONDS = 3600;

export async function GET() {
  try {
    const res = await fetch(upstreamUrl`/api/v1beta/regulations`, {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ message: "error" }, { status: res.status });
    }

    const data: RegulationType[] = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ message: "internal server error" }, { status: 500 });
  }
}
