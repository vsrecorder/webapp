"use client";

import { useSyncExternalStore } from "react";

import type { DeckCardView } from "@app/components/organisms/Deck/DeckCard";

// デッキ一覧の表示モードを localStorage に保存するキー。
// 表示密度の好みはユーザーごとの習慣なので、次回アクセス時も同じ状態で開く。
const DECK_VIEW_STORAGE_KEY = "deckListView";

// 保存値が無い（初めて開いた）ときとサーバ描画時の表示モード。
const DEFAULT_VIEW: DeckCardView = "gallery";

// localStorage は同一タブ内の更新を通知しないため、購読者へ伝える独自イベントを使う。
const CHANGE_EVENT = "deckListViewChange";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  // 別タブでの変更（storage イベント）にも追従する。
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): DeckCardView {
  try {
    const saved = localStorage.getItem(DECK_VIEW_STORAGE_KEY);

    return saved === "list" || saved === "gallery" ? saved : DEFAULT_VIEW;
  } catch {
    // localStorage が使えない環境（プライベートモード等）では既定値で動かす。
    return DEFAULT_VIEW;
  }
}

function getServerSnapshot(): DeckCardView {
  return DEFAULT_VIEW;
}

// 保存済みの表示モードを返す。useSyncExternalStore を使うことで、
// クライアント遷移では最初の描画から保存値を反映しつつ、
// サーバ描画（ハードリロード）ではハイドレーション不一致を起こさずに
// ハイドレーション後へ反映を先送りできる。
export function useDeckListView(): DeckCardView {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setDeckListView(next: DeckCardView) {
  try {
    localStorage.setItem(DECK_VIEW_STORAGE_KEY, next);
  } catch {
    // 保存できなくても表示モードの切り替え自体は成立させる。
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}
