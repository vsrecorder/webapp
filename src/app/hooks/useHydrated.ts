"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/*
 * ハイドレーションが済んだかを返す。サーバ描画とハイドレーション時の最初の描画では false、
 * その後の描画で true になる。
 *
 * 「3分前」のような現在時刻や端末のタイムゾーンに依る表示を、サーバと同じ内容で一度描画してから
 * クライアント側の値に差し替えるために使う(そのまま出すとサーバとクライアントで文字が食い違い、
 * ハイドレーションの不一致になる)。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
