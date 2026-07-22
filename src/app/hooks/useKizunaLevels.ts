"use client";

import useSWR from "swr";

import { KizunaDeckType, KizunaType } from "@app/types/kizuna";

/*
 * デッキごとのきずなLv.（0〜255）。スプライトの揺れ方を決めるのに使う。
 *
 * デッキ単位ではなく「そのユーザーの全デッキぶん」を1回で取る。
 * デッキ一覧・デッキ詳細モーダルなど複数の場所から呼ばれるが、SWR が同じキーの
 * 取得をまとめるため、画面あたりのリクエストは1回で済む。
 *
 * 取得に失敗しても画面は出したいので、エラーは呼び出し側に投げず空の Map にする。
 * きずなは主役ではなく演出なので、失敗しても「揺れないだけ」で済ませる。
 */
async function fetcher(url: string): Promise<Map<string, KizunaDeckType>> {
  const res = await fetch(url, {
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) return new Map();

  const kizuna: KizunaType = await res.json();

  return new Map(kizuna.decks.map((deck) => [deck.deck_id, deck]));
}

const EMPTY = new Map<string, KizunaDeckType>();

// deck_id → きずなの算出結果（きずなLv.と6指標の内訳）
export function useKizunaDecks(userId: string | null | undefined) {
  const { data } = useSWR<Map<string, KizunaDeckType>, Error>(
    userId ? `/api/users/${userId}/kizuna` : null,
    fetcher,
    {
      // きずなLv.は対戦を記録しない限り変わらない。画面を戻るたびに取り直さない。
      revalidateOnFocus: false,
      // 失敗しても演出が出ないだけなので、再試行で無駄に叩かない
      shouldRetryOnError: false,
    },
  );

  return data ?? EMPTY;
}

// デッキ1つぶんの内訳込みの結果。取得前・他人のデッキは null。
export function useKizunaDeck(
  userId: string | null | undefined,
  deckId: string | null | undefined,
): KizunaDeckType | null {
  const decks = useKizunaDecks(userId);

  if (!deckId) return null;

  return decks.get(deckId) ?? null;
}

// きずなLv.だけ欲しい場合。取得前・他人のデッキは null（＝灯も揺れも数値も出さない）。
export function useKizunaLevel(
  userId: string | null | undefined,
  deckId: string | null | undefined,
): number | null {
  return useKizunaDeck(userId, deckId)?.level ?? null;
}
