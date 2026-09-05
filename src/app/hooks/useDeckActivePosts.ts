"use client";

import { useMemo } from "react";

import useSWR from "swr";

import {
  DeckCodePostGetByDeckIdResponseType,
  DeckCodePostType,
} from "@app/types/deck_code_post";
import { swrFetcher } from "@app/utils/deckCodePost";

const fetcher = (url: string) => swrFetcher<DeckCodePostGetByDeckIdResponseType>(url);

// デッキの公開中の投稿の SWR キー。アーカイブ時にキャッシュを消すために外からも使う
export function deckActivePostsKey(deckId: string): string {
  return `/api/decks/${deckId}/deck_code_posts`;
}

/*
 * デッキの公開中の投稿(みんなの公開デッキ)を、デッキコードIDで引ける形にして返す。
 *
 * デッキ詳細モーダルの公開スイッチ(最新バージョン)とバージョン履歴の公開スイッチ
 * (各バージョン)が同じデッキを見ているため、SWR のキャッシュを共有して
 * どちらで切り替えても両方の表示が揃うようにする。
 */
export function useDeckActivePosts(deckId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<DeckCodePostGetByDeckIdResponseType, Error>(
    deckId ? deckActivePostsKey(deckId) : null,
    fetcher,
  );

  const byDeckCodeId = useMemo(() => {
    const map = new Map<string, DeckCodePostType>();
    for (const post of data ?? []) {
      map.set(post.deck_code_id, post);
    }
    return map;
  }, [data]);

  return {
    byDeckCodeId,
    isLoading,
    error,
    mutate,
  };
}
