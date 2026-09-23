"use client";

import { useCallback, useEffect } from "react";

import useSWR, { useSWRConfig } from "swr";

import { DeckCodeType } from "@app/types/deck_code";

// デッキコード一覧の取得先。件数を出す側(ShowDeckModal の「◯件」・DeckCard 等)と
// バージョン履歴(DisplayDeckCodes)が同じデッキを指すので、鍵を1か所で決めておき、
// 取り直しの対象がずれないようにする。
export function deckCodesKey(deckId: string) {
  return `/api/decks/${deckId}/deckcodes`;
}

async function fetcher(url: string): Promise<DeckCodeType[]> {
  const res = await fetch(url, {
    // バージョンの追加・削除の直後に取り直すため、HTTPキャッシュに当てさせない
    // (バージョン履歴側の fetchDeckCodesByDeckId と同じ扱い)
    cache: "no-store",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
}

// 指定したデッキに紐づく全デッキコード（＝全バージョン）を取得する。
// レスポンスは作成日時の降順（新しい順）で返る。
//
// watchDeckCodeId には、現在選択中のデッキコードID（deckcode.id）を渡す。
// 新バージョンの作成・削除で選択中のIDが変わったときに一覧を再取得し、
// 新しいバージョンが一覧に反映されないまま通し番号が求まらなくなる
// （表示が「取得中...」のまま固定される）事態を防ぐ。
export function useDeckCodes(
  deckId: string | null | undefined,
  watchDeckCodeId?: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR<DeckCodeType[], Error>(
    deckId ? deckCodesKey(deckId) : null,
    fetcher,
  );

  useEffect(() => {
    if (!deckId || !watchDeckCodeId) return;
    mutate();
    // deckId/mutateは同一キーである限り安定しているため、
    // watchDeckCodeIdの変化のみをトリガーにする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchDeckCodeId]);

  return {
    deckcodes: data,
    isLoading,
    error,
    mutate,
  };
}

/*
 * バージョンの増減を、件数を出している側(ShowDeckModal の「◯件」など)へ反映させる。
 *
 * バージョン履歴(DisplayDeckCodes)は SWR ではなく useSeededResource で一覧を持ち、
 * 追加・削除の結果を自分の state にだけ反映する。そのため履歴で増減させても
 * useDeckCodes の SWR キャッシュは古いままで、件数が変わらない。
 *
 * useDeckCodes は watchDeckCodeId(表示中のバージョンID)の変化でも取り直すが、
 * 表示中でないバージョンを削除したときは ID が変わらないため取り直しが起きない。
 * 増減させた側から明示的にこれを呼ぶ。
 */
export function useRevalidateDeckCodes() {
  const { mutate } = useSWRConfig();

  return useCallback(
    (deckId: string | null | undefined) => {
      if (!deckId) return;

      return mutate(deckCodesKey(deckId));
    },
    [mutate],
  );
}

// deckcodes（作成日時降順で取得した全バージョン）の中から、
// 指定したデッキコードの通し番号（登録が古い順で1, 2, 3...）を求める。
// deckcodesが未取得、または対象のIDが見つからない場合はnullを返す。
export function getDeckCodeVersionNumber(
  deckcodes: DeckCodeType[] | undefined,
  deckCodeId: string | null | undefined,
): number | null {
  // 配列でないもの（想定外のレスポンス）が渡ってもfindIndexで落ちないようにする。
  // ここはデッキ一覧・デッキ詳細のレンダー中に呼ばれるため、例外はページ全体を落とす。
  if (!Array.isArray(deckcodes) || !deckCodeId) return null;

  const index = deckcodes.findIndex((dc) => dc.id === deckCodeId);

  return index === -1 ? null : deckcodes.length - index;
}
