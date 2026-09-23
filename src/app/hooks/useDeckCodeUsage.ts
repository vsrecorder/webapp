"use client";

import useSWR from "swr";

import { DeckCodeUsageStatType } from "@app/types/deck_usage_stat";
import { EXCLUDE_DEFAULT_MATCHES_QUERY } from "@app/utils/excludeDefaultMatches";

async function fetcher(url: string): Promise<DeckCodeUsageStatType> {
  const res = await fetch(url, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

/*
 * デッキの対戦成績をバージョン(デッキコード)ごとに分けて取得する(全期間)。
 *
 * 不戦勝・不戦敗は外す。同じ画面の上にあるデッキ全体の戦績(DECK_USAGE_ALL_TIME_QUERY)と
 * 条件を揃えないと、全体とバージョン別で勝ち数の合計が合わなくなるため。
 * 自分のデッキのときだけ userId を渡す(他人のデッキでは取得しない)。
 */
export function useDeckCodeUsage(
  userId: string | null | undefined,
  deckId: string | null | undefined,
) {
  const { data, error, isLoading } = useSWR<DeckCodeUsageStatType, Error>(
    userId && deckId
      ? `/api/users/${userId}/deck-code-usage?deck_id=${encodeURIComponent(deckId)}&${EXCLUDE_DEFAULT_MATCHES_QUERY}`
      : null,
    fetcher,
  );

  return { stat: data, error, isLoading };
}
