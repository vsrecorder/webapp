"use client";

import { useSyncExternalStore } from "react";

import { readSessionStorage, subscribeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * sessionStorage の1項目を描画中に読む。サーバ描画とハイドレーション時の最初の描画では
 * null(無いのと同じ)、その後の描画では保存されている文字列を返す。
 *
 * 書き込みは utils/sessionStorageStore の writeSessionStorage で行うこと。直接
 * sessionStorage.setItem/removeItem すると、同じタブ内のこのフックへ通知されず表示が古いままになる。
 */
export function useSessionStorageItem(key: string): string | null {
  return useSyncExternalStore(
    subscribeSessionStorage,
    () => readSessionStorage(key),
    () => null,
  );
}
