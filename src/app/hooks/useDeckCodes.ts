"use client";

import { useEffect } from "react";

import useSWR from "swr";

import { DeckCodeType } from "@app/types/deck_code";

async function fetcher(url: string): Promise<DeckCodeType[]> {
  const res = await fetch(url, {
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
    deckId ? `/api/decks/${deckId}/deckcodes` : null,
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

// deckcodes（作成日時降順で取得した全バージョン）の中から、
// 指定したデッキコードの通し番号（登録が古い順で1, 2, 3...）を求める。
// deckcodesが未取得、または対象のIDが見つからない場合はnullを返す。
export function getDeckCodeVersionNumber(
  deckcodes: DeckCodeType[] | undefined,
  deckCodeId: string | null | undefined,
): number | null {
  if (!deckcodes || !deckCodeId) return null;

  const index = deckcodes.findIndex((dc) => dc.id === deckCodeId);

  return index === -1 ? null : deckcodes.length - index;
}
