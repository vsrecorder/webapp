"use client";

import { createContext, createElement, useContext, useEffect, useSyncExternalStore } from "react";

import type { DeckCardView } from "@app/components/organisms/Deck/DeckCard";
import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  DECK_LIST_VIEW_COOKIE,
  DECK_LIST_VIEW_COOKIE_MAX_AGE,
  parseDeckListView,
} from "@app/utils/deckListPrefs";

// 以前の保存先(localStorage)。cookie に移したので読むだけ(移行用)
const LEGACY_STORAGE_KEY = "deckListView";

// 保存値が無い(初めて開いた)ときとサーバ描画時の表示モード。
const DEFAULT_VIEW: DeckCardView = "gallery";

// cookie は同一タブ内の更新を通知しないため、購読者へ伝える独自イベントを使う。
const CHANGE_EVENT = "deckListViewChange";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function readLegacy(): DeckCardView | null {
  try {
    return parseDeckListView(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    // localStorage が使えない環境（プライベートモード等）
    return null;
  }
}

function getSnapshot(): DeckCardView {
  return (
    parseDeckListView(readClientCookie(DECK_LIST_VIEW_COOKIE)) ?? readLegacy() ?? DEFAULT_VIEW
  );
}

/*
 * サーバ描画で使う表示モード。decks/page.tsx と loading.tsx が cookie から読み、
 * この Provider で配る。ハイドレーション時はこの値で描き(サーバ描画と一致させる)、
 * その後は cookie の値に切り替わる。同じ cookie を読んでいるので通常は同じ値。
 * Provider の外(cookie を読まないページ)では既定のギャラリー。
 */
const ServerViewContext = createContext<DeckCardView | null>(null);

export function DeckListViewProvider({
  initialView,
  children,
}: {
  initialView: DeckCardView | null;
  children: React.ReactNode;
}) {
  // このファイルは .ts のまま(JSX を使わない)。拡張子を変えると開発サーバのモジュール解決が
  // 古いパスを掴んだままになり、再起動するまでページが 500 になる
  return createElement(ServerViewContext.Provider, { value: initialView }, children);
}

// 保存済みの表示モードを返す。useSyncExternalStore を使うことで、
// クライアント遷移では最初の描画から保存値を反映しつつ、
// サーバ描画（ハードリロード）ではハイドレーション不一致を起こさない。
export function useDeckListView(): DeckCardView {
  const serverView = useContext(ServerViewContext);
  const view = useSyncExternalStore(subscribe, getSnapshot, () => serverView ?? DEFAULT_VIEW);

  // 以前の保存先(localStorage)にだけ値がある人は cookie へ移し、次からはサーバ描画も同じ形にする。
  // この移行の初回だけは、サーバがギャラリーで描いた後にリストへ切り替わる
  useEffect(() => {
    if (readClientCookie(DECK_LIST_VIEW_COOKIE) !== null) return;

    const legacy = readLegacy();
    if (legacy) writeClientCookie(DECK_LIST_VIEW_COOKIE, legacy, DECK_LIST_VIEW_COOKIE_MAX_AGE);
  }, []);

  return view;
}

export function setDeckListView(next: DeckCardView) {
  writeClientCookie(DECK_LIST_VIEW_COOKIE, next, DECK_LIST_VIEW_COOKIE_MAX_AGE);
  try {
    // 古い版に戻したときも同じ表示になるよう、以前の保存先にも書いておく
    localStorage.setItem(LEGACY_STORAGE_KEY, next);
  } catch {
    // 保存できなくても表示モードの切り替え自体は成立させる。
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}
