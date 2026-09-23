"use client";

import { useEffect, useMemo } from "react";

import useSWR from "swr";

import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { DECK_USAGE_ALL_TIME_QUERY } from "@app/utils/excludeDefaultMatches";

/*
 * デッキごとの全期間の対戦数・勝率・先攻/後攻情報（デッキ一覧カードに出す戦績）。
 * 対戦記録が無いデッキは結果に含まれない。
 *
 * SWR で持つ。デッキ一覧(Decks)はタブ切替や戻り遷移のたびに作り直されるが、
 * 素の fetch だとそのたびに取り直しを待っていた。この API は一覧まわりで最も遅く
 * (本番 p90 で 0.2 秒)、キャッシュがあれば即座に出し、裏で取り直す。
 *
 * 取得に失敗したときは空にせず、呼び出し側へ failed で伝える。空にすると戦績の無い
 * デッキ(「対戦なし」)と同じ見た目になり、対戦を持つデッキに「まだ使っていない」と
 * 言うことになる。デッキ一覧は失敗を1か所に出し、その場で取り直させる。
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

  if (!res.ok) throw new Error("Failed to fetch");

  const stat: DeckUsageStatType = await res.json();

  return Array.isArray(stat?.decks) ? stat.decks : [];
}

function toMap(decks: DeckUsageItemType[]): Map<string, DeckUsageItemType> {
  return new Map(decks.map((deck) => [deck.deck_id, deck]));
}

const EMPTY = new Map<string, DeckUsageItemType>();

export type DeckUsageAllTime = {
  // deck_id → 全期間の戦績。取得前・失敗時は空の Map
  stats: Map<string, DeckUsageItemType>;
  // 一度も取得できていないのに失敗したか(一覧に理由を出して取り直させる)
  failed: boolean;
  // 取り直し中(エラーは出したままボタンだけ回す)
  isRetrying: boolean;
  retry: () => void;
};

// initial / isInitialFresh の扱いは useKizunaDecksState と同じ
// (いま取られたものならマウント時の取り直しをやめ、キャッシュを上書きする)
export function useDeckUsageAllTime(
  userId: string | null | undefined,
  initial?: DeckUsageStatType | null,
  isInitialFresh = false,
): DeckUsageAllTime {
  const initialDecks = initial?.decks;
  const canSkipRevalidation = isInitialFresh && initialDecks !== undefined;

  const { data, error, isValidating, mutate } = useSWR<DeckUsageItemType[], Error>(
    userId ? `/api/users/${userId}/deck-usage?${DECK_USAGE_ALL_TIME_QUERY}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      // 自動では追いかけない。失敗は一覧に出して、押されたときだけ取り直す
      shouldRetryOnError: false,
      fallbackData: initialDecks,
      revalidateOnMount: canSkipRevalidation ? false : undefined,
    },
  );

  // 取り直しをやめる場合は、以前の訪問で残ったキャッシュをサーバで取った値で上書きする
  useEffect(() => {
    if (!canSkipRevalidation || !initialDecks) return;

    void mutate(initialDecks, { revalidate: false });
  }, [canSkipRevalidation, initialDecks, mutate]);

  const stats = useMemo(() => (data ? toMap(data) : EMPTY), [data]);

  /*
   * 一度も取れていないときだけ失敗として扱う。裏での取り直し(自動再検証)が失敗しても、
   * 表示中の戦績は消さない(消すと一覧がちらつくうえ、出ていた数字が理由なく消える)。
   */
  const failed = data === undefined && !!error;

  return {
    stats,
    failed,
    isRetrying: failed && isValidating,
    retry: () => {
      void mutate();
    },
  };
}
