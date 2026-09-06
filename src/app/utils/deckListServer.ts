import { cache } from "react";

import { DeckGetResponseType, DecksInitialDataType } from "@app/types/deck";
import { DeckUsageStatType } from "@app/types/deck_usage_stat";
import { KizunaType } from "@app/types/kizuna";
import { DECK_PAGE_LIMIT, toDeckPage } from "@app/utils/deckListPage";
import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

/*
 * デッキ一覧(/decks)の初期表示に要るデータを、サーバ側(ページの描画)から上流へ直接取る。
 * ブラウザからは BFF(/api/decks・/api/users/[id]/kizuna・/api/users/[id]/deck-usage)を使う。
 *
 * みんなの公開デッキ(deckCodePostServer)と同じ型。クライアントで取ると
 * 「HTML → JS → ハイドレーション → API 3本 → 描画」の直列になり、サーバで取れば
 * HTML(RSC)の時点でカードが載る。上流は本番 p50 で 30〜70ms なので、3本を並列に取っても
 * ページの応答が遅れるのはその程度で、クライアント側の往復(端末では 100〜300ms)が丸ごと消える。
 *
 * どれかが取れなくても null にしてページは出す(クライアントが取り直す)。
 */

async function getFirst<T>(label: string, url: string, headers: HeadersInit): Promise<T | null> {
  try {
    return await fetchUpstream<T>(url, { method: "GET", headers });
  } catch (error) {
    console.error(`failed to fetch ${label} for the decks page`, error);
    return null;
  }
}

// 選択中タブ(利用中/アーカイブ済み)のデッキの1ページ目・きずな・全期間の戦績。
// 同じリクエスト内で同じ引数で二度呼ばれても1回で済ませる
export const getDecksInitialData = cache(
  async (userId: string, archived: boolean): Promise<DecksInitialDataType> => {
  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: "Bearer " + signUpstreamToken(userId),
  };

  const [decks, kizuna, usage] = await Promise.all([
    getFirst<DeckGetResponseType>(
      "decks",
      // BFF(/api/decks)と同じく1件多く取り、次ページの有無を決める
      upstreamUrl`/api/v1beta/decks?limit=${DECK_PAGE_LIMIT + 1}&archived=${archived}&cursor=`,
      headers,
    ),
    getFirst<KizunaType>("kizuna", upstreamUrl`/api/v1beta/users/${userId}/kizuna`, headers),
    getFirst<DeckUsageStatType>(
      "deck usage",
      upstreamUrl`/api/v1beta/users/${userId}/deck_usage?all_time=true`,
      headers,
    ),
  ]);

  return {
    // 想定外の形(decks が配列でない)は使わない。クライアントが BFF から取り直して検査する
    decks: decks && Array.isArray(decks.decks) ? toDeckPage(decks) : null,
    kizuna,
    usage,
  };
  },
);
