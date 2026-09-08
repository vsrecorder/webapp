"use client";

import { useSyncExternalStore } from "react";

import { readLocalStorage, subscribeLocalStorage } from "@app/utils/localStorageStore";

/*
 * localStorage の1項目を描画中に読む。サーバ描画とハイドレーション時の最初の描画では
 * null(未保存と同じ)、その後の描画では保存されている文字列を返す。
 *
 * 書き込みは utils/localStorageStore の writeLocalStorage で行うこと。直接
 * localStorage.setItem すると、同じタブ内のこのフックへ通知されず表示が古いままになる。
 */
export function useLocalStorageItem(key: string): string | null {
  return useSyncExternalStore(
    subscribeLocalStorage,
    () => readLocalStorage(key),
    () => null,
  );
}
