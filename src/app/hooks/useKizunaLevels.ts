"use client";

import { useMemo } from "react";

import useSWR from "swr";

import { KizunaDeckType, KizunaType } from "@app/types/kizuna";

/*
 * デッキごとのきずなLv.（0〜255）。スプライトの揺れ方を決めるのに使う。
 *
 * デッキ単位ではなく「そのユーザーの全デッキぶん」を1回で取る。
 * デッキ一覧・デッキ詳細モーダルなど複数の場所から呼ばれるが、SWR が同じキーの
 * 取得をまとめるため、画面あたりのリクエストは1回で済む。
 *
 * 取得に失敗しても画面は出したいので、エラーは呼び出し側に投げず空にする。
 * きずなは主役ではなく演出なので、失敗しても「揺れないだけ」で済ませる。
 *
 * SWR に持たせるのは Map ではなく配列(デッキごとの結果)。SWR の既定の比較関数(dequal)は
 * Map の中身を比べられず、別の Map を常に「同じ」と判定して取り直しの結果を捨てる
 * (実測: compare(new Map([["a",{level:1}]]), new Map([["a",{level:2}]])) が true)。
 * Map を持たせていた頃は、同じセッション内で戻って来ても きずなLv. が一度も更新されなかった。
 * 配列なら中身で比較されるので、値が変わったときだけ再描画される。
 */

// これ以上待つと一覧が出ない。デッキ一覧はきずなが揃うまでカードを出さないので、
// 上流が固まったときに一覧まで道連れにしないための上限(本番の応答は p90 でも 0.06 秒)
const TIMEOUT_MS = 8000;

async function fetcher(url: string): Promise<KizunaDeckType[]> {
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // タイムアウト・通信断。演出が出ないだけで済ませる
    return [];
  }

  if (!res.ok) return [];

  const kizuna: KizunaType = await res.json();

  return Array.isArray(kizuna?.decks) ? kizuna.decks : [];
}

function toMap(decks: KizunaDeckType[]): Map<string, KizunaDeckType> {
  return new Map(decks.map((deck) => [deck.deck_id, deck]));
}

const EMPTY = new Map<string, KizunaDeckType>();

// deck_id → きずなの算出結果（きずなLv.と6指標の内訳）と、取得中かどうか。
// isLoading は「まだ何も無い」間だけ true(SWR のキャッシュか initial があれば false)。
// デッキ一覧はこれを見て、きずなが揃うまでカードを出さずに骨格を保つ。
//
// initial はサーバ描画(decks/page.tsx)で取った値。渡されたときは最初の描画からそれを使う。
// ただしマウント時の取り直し(SWR の既定)は止めない: ブラウザの「戻る」ではサーバ描画の結果が
// そのまま再利用され(実測で確認)、記録を付けてから戻ると initial が古い。取り直しは裏で走り、
// 表示を待たせないので、初期値は「最初の描画を速くする」ためだけに使う。
export function useKizunaDecksState(
  userId: string | null | undefined,
  initial?: KizunaType | null,
) {
  const { data, isLoading } = useSWR<KizunaDeckType[], Error>(
    userId ? `/api/users/${userId}/kizuna` : null,
    fetcher,
    {
      // きずなLv.は対戦を記録しない限り変わらない。画面を戻るたびに取り直さない。
      revalidateOnFocus: false,
      // 失敗しても演出が出ないだけなので、再試行で無駄に叩かない
      shouldRetryOnError: false,
      fallbackData: initial?.decks,
    },
  );

  const decks = useMemo(() => (data ? toMap(data) : EMPTY), [data]);

  // SWR の isLoading は fallbackData を「読み込み済み」とみなさず、マウント時の取り直し中も true になる。
  // 一覧が待つべきなのは「まだ何も無い」ときだけなので、data の有無で決める
  return { decks, isLoading: isLoading && data === undefined };
}

// deck_id → きずなの算出結果。取得中・失敗時は空の Map
export function useKizunaDecks(userId: string | null | undefined) {
  return useKizunaDecksState(userId).decks;
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
