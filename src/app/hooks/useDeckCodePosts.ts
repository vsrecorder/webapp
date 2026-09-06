"use client";

import { useCallback } from "react";

import { useOffsetPagination } from "@app/hooks/useOffsetPagination";
import {
  DeckCodePostEnvironmentType,
  DeckCodePostGetResponseType,
  DeckCodePostType,
} from "@app/types/deck_code_post";
import { swrFetcher } from "@app/utils/deckCodePost";

const PAGE_SIZE = 20;

const postId = (post: DeckCodePostType) => post.id;

type Params = {
  // 空なら現在の環境(バックエンドが今日から決める)
  environmentId: string;
  // 空なら絞り込みなし。指定したスプライトをすべて持つデッキに絞る(最大2体)
  pokemonSpriteIds?: string[];
  // 空なら絞り込みなし。その ACE SPEC(カード名)を採用した投稿に絞る
  acespecCardName?: string;
  // サーバ側で取った1ページ目(新着・現在の環境・絞り込みなし)。初回の取得を省き、
  // HTML に投稿へのリンクを載せる(クローラが個別ページを見つけられるようにする)
  initial?: DeckCodePostGetResponseType;
};

/*
 * みんなの公開デッキの一覧。環境・スプライト・ACE SPEC が変わったら先頭から読み直し、
 * 「もっと見る」で次のページを足す(useOffsetPagination)。
 * いいねの結果はページをまたいで同じ投稿に反映したいので、投稿の差し替え(updatePost)も返す。
 *
 * 並び順は新着だけ(人気順は廃止)。
 */
export function useDeckCodePosts({
  environmentId,
  pokemonSpriteIds = [],
  acespecCardName = "",
  initial,
}: Params) {
  // 配列のまま依存に入れると描画ごとに別物になるため、ID は "," で結んだ文字列で持ち回る
  // (ID に "," は含まれない)
  const spriteKey = pokemonSpriteIds.join(",");

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams();
      params.set("sort", "new");
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (environmentId) params.set("environment_id", environmentId);
      if (acespecCardName) params.set("acespec_card_name", acespecCardName);
      for (const id of spriteKey ? spriteKey.split(",") : []) params.append("pokemon_sprite_id", id);

      const data = await swrFetcher<DeckCodePostGetResponseType>(
        `/api/deck_code_posts?${params.toString()}`,
      );

      return { items: data.posts, meta: data.environment };
    },
    [environmentId, acespecCardName, spriteKey],
  );

  // 初期値は同じ条件(現在の環境・絞り込みなし)のときだけ使う
  const seed =
    initial && !environmentId && !spriteKey && !acespecCardName
      ? { items: initial.posts, meta: initial.environment }
      : undefined;

  const { items, meta, lastMeta, isLoading, isLoadingMore, hasMore, error, loadMore, updateItem } =
    useOffsetPagination<DeckCodePostType, DeckCodePostEnvironmentType | null>({
      key: `${environmentId}|${acespecCardName}|${spriteKey}`,
      pageSize: PAGE_SIZE,
      fetchPage,
      getId: postId,
      initial: seed,
    });

  return {
    posts: items,
    // 絞り込みの変更で読み直している間も、直前の応答の環境を出したままにする
    // (null に戻すと環境チップの文言が「環境」に変わり、幅が変わって隣のチップまで動いて見える)。
    // 環境を変えたときは選んだ環境の名前を優先して出すので、古い値が見えることはない
    environment: meta ?? lastMeta ?? null,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    updatePost: updateItem,
  };
}
