"use client";

import { useMemo } from "react";

import useSWR from "swr";

import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";

/*
 * デッキごとの全期間の対戦数・勝率・先攻/後攻情報（デッキ一覧カードに出す戦績）。
 * 対戦記録が無いデッキは結果に含まれない。
 *
 * SWR で持つ。デッキ一覧(Decks)はタブ切替や戻り遷移のたびに作り直されるが、
 * 素の fetch だとそのたびに取り直しを待っていた。この API は一覧まわりで最も遅く
 * (本番 p90 で 0.2 秒)、キャッシュがあれば即座に出し、裏で取り直す。
 *
 * 取得に失敗しても画面は出したいので、エラーは呼び出し側に投げず空にする
 * (戦績は「対戦記録なし」として描かれる)。
 *
 * SWR に持たせるのは Map ではなく配列。理由は useKizunaDecksState と同じ
 * (SWR の既定の比較関数は Map の中身を比べられず、取り直しの結果を捨てる)。
 */
async function fetcher(url: string): Promise<DeckUsageItemType[]> {
  const res = await fetch(url, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) return [];

  const stat: DeckUsageStatType = await res.json();

  return Array.isArray(stat?.decks) ? stat.decks : [];
}

function toMap(decks: DeckUsageItemType[]): Map<string, DeckUsageItemType> {
  return new Map(decks.map((deck) => [deck.deck_id, deck]));
}

const EMPTY = new Map<string, DeckUsageItemType>();

// deck_id → 全期間の戦績。取得前・失敗時は空の Map。
// initial はサーバ描画(decks/page.tsx)で取った値。最初の描画にだけ使い、マウント時の取り直しは
// 止めない(「戻る」でサーバ描画の結果が再利用されると古いため。useKizunaDecksState と同じ)
export function useDeckUsageAllTime(
  userId: string | null | undefined,
  initial?: DeckUsageStatType | null,
) {
  const { data } = useSWR<DeckUsageItemType[], Error>(
    userId ? `/api/users/${userId}/deck-usage?all_time=true` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      // 失敗しても「対戦記録なし」で出るだけなので、再試行で無駄に叩かない
      shouldRetryOnError: false,
      fallbackData: initial?.decks,
    },
  );

  return useMemo(() => (data ? toMap(data) : EMPTY), [data]);
}
