"use client";

/*
 * みんなの公開デッキの一覧(templates/SharedDecks)と投稿者ページ(templates/SharedDecksByUser)から
 * 別のページ(個別ページ・投稿者ページ)へ進んで戻ってきたとき、離れる前と同じ一覧・同じ位置で
 * 見せるための sessionStorage の控え。
 *
 * 一覧の絞り込み(環境・ポケモン・ACE SPEC)と「もっと見る」で読んだ投稿はコンポーネントの
 * state なので、ページを離れると消える。戻ると絞り込みなしの1ページ目から出直しになり、
 * 見ていたカードが読み込まれていないことすらあった。そこで進む直前に一覧の中身ごと控え、
 * 戻ってきた一覧はそれをそのまま描いてから、押したカードを元の画面上の高さへ戻す。
 *
 * 取り直さずに控えた中身を描くのは、取り直すと上に新しい投稿が足されたり、読み込んだ
 * ページ数ぶん待たされたりして、同じ位置に戻せないため。いいね数などが離れた時点のままに
 * なりうるが、絞り込みを変えたり開き直したりすれば最新になる。
 *
 * 一覧と投稿者ページは別のキーに控える。一覧 → 投稿者ページ → 個別ページ と進んで2回戻ったとき、
 * それぞれが自分の控えで元に戻れるようにするため。
 */

import { MouseEvent } from "react";

import {
  DeckCodePostAceSpecCountType,
  DeckCodePostEnvironmentType,
  DeckCodePostType,
} from "@app/types/deck_code_post";
import { EnvironmentType } from "@app/types/environment";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";
import { saveReturnAnchorTop, writeReturnTarget } from "@app/utils/returnTarget";
import { writeSessionStorage } from "@app/utils/sessionStorageStore";

export const SHARED_DECKS_RETURN_KEY = "sharedDecksReturnState";
export const SHARED_DECKS_USER_RETURN_KEY = "sharedDecksUserReturnState";

// 一覧と投稿者ページに共通の控え
export type PostListReturnState = {
  // 押したカードの投稿ID。戻ったときこのカードを元の高さへ置く
  anchorPostId: string;
  // 読み込み済みの投稿と、続きの有無
  posts: DeckCodePostType[];
  hasMore: boolean;
  // 控えた時刻(Date.now())。これより後に「戻る/進む」があったときだけ戻す
  savedAt: number;
};

// 一覧の控え。絞り込み(一覧の state そのもの)と、応答の環境も持つ
export type SharedDecksReturnState = PostListReturnState & {
  environment: EnvironmentType | null;
  sprite1: PokemonSpriteType | null;
  sprite2: PokemonSpriteType | null;
  aceSpec: DeckCodePostAceSpecCountType | null;
  postsEnvironment: DeckCodePostEnvironmentType | null;
};

// 投稿者ページの控え。別の投稿者のページでは使わない
export type SharedDecksUserReturnState = PostListReturnState & {
  userId: string;
};

/*
 * 一覧のカードの目印(id)。戻ったときにこの位置まで移動する。
 *
 * 一覧ごと(控えのキーごと)に分ける。離れる直前の高さは目印ごとに覚える(saveReturnAnchorTop)ので、
 * 同じ投稿を一覧と投稿者ページの両方から開くと、投稿IDだけの目印では後から開いた側の高さで
 * 上書きされ、一覧へ戻ったときにずれる。
 */
export function sharedDeckPostAnchorId(key: string, postId: string): string {
  return `${key}-${postId}`;
}

// 別のページへ進む直前に呼ぶ。今表示している一覧には受け取らせない(writeReturnTarget)
export function markPostListReturn<S extends PostListReturnState>(
  key: string,
  state: Omit<S, "savedAt">,
): void {
  saveReturnAnchorTop(sharedDeckPostAnchorId(key, state.anchorPostId));

  // 容量超過などで書けないと前回の控えが残り、戻ったときに別の一覧を出してしまう。
  // 先に消しておけば、書けなかったときは先頭から出るだけで済む
  writeSessionStorage(key, null);
  writeReturnTarget(key, JSON.stringify({ ...state, savedAt: Date.now() }));
}

// 戻って位置を合わせ終えたら消す(次に普通に開いたときに古い一覧を出さない)
export function clearPostListReturn(key: string): void {
  writeSessionStorage(key, null);
}

// 控えた値を読む。壊れていれば null(先頭から出す)
export function parsePostListReturn<S extends PostListReturnState>(raw: string | null): S | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;

    const state = value as S;
    if (
      typeof state.anchorPostId !== "string" ||
      !Array.isArray(state.posts) ||
      typeof state.savedAt !== "number"
    ) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

/*
 * カードの中で押されたのが、この一覧を離れる(同じタブで別のページへ進む)リンクか。
 * 詳細・投稿者・いいねした人(モーダルの中)へのリンクがそう。公式サイトのように
 * 別タブで開くもの、修飾キー付きで新しいタブに開くもの、今いるページへのリンク
 * (投稿者ページのカードの投稿者名)は一覧が残るので除く。
 */
export function isLeavingLinkClick(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const link = (event.target as Element | null)?.closest?.("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return false;
  if (link.target && link.target !== "_self") return false;

  const href = link.getAttribute("href") ?? "";
  if (!href.startsWith("/") || href.startsWith("//")) return false;

  return new URL(href, window.location.href).pathname !== window.location.pathname;
}
