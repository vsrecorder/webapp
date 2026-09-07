import { cache } from "react";

import {
  OfficialEventResponseType,
  OfficialEventUpstreamResponseType,
} from "@app/types/official_event";
import { toOfficialEventListItem } from "@app/utils/officialEventList";
import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";

/*
 * 公式イベントの一覧を上流から取り、ブラウザへ渡す形へ絞って返す。
 * BFF(/api/official_events)とサーバ描画(records/create/page.tsx)の両方がこれを使う。
 *
 * 一覧は日付(と種別)で決まる全ユーザー共通のデータで、利用者ごとに変わる部分が無い。
 * 同じ日を見る全員のリクエストがそのまま上流へ届いていたので Data Cache に載せる。
 * 本番の nginx ログ(2日ぶん)では、BFF から上流への103回のうち34回(33%)が
 * 直前5分以内の同一URLだった。
 *
 * cache: "force-cache" を明示するのは fetchUpstream の既定が "no-store" のため。
 * no-store と revalidate は併用すると両方無視される(Next.js の fetch の仕様)。
 * 期間は、当日の中止や定員変更が反映されることを考えて5分。
 */
const REVALIDATE_SECONDS = 300;

// react の cache で包むのは、同じ描画の中で複数箇所から呼んでも1回で済ませるため。
// リクエストを跨ぐキャッシュは上の fetch の Data Cache が受け持つ。
export const getOfficialEventList = cache(async function getOfficialEventList(
  type_id: string,
  league_type: string,
  date: string,
): Promise<OfficialEventResponseType> {
  const upstream = await fetchUpstream<OfficialEventUpstreamResponseType>(
    upstreamUrl`/api/v1beta/official_events?type_id=${type_id}&league_type=${league_type}&date=${date}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
    },
  );

  return {
    ...upstream,
    official_events: (upstream.official_events ?? []).map(toOfficialEventListItem),
  };
});
