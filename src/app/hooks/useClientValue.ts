"use client";

import { useSyncExternalStore } from "react";

function subscribeNothing() {
  return () => {};
}

/*
 * ブラウザでしか決まらない値(UserAgent・display-mode・window の寸法・機能の有無など)を
 * 描画中に読むためのフック。サーバ描画とハイドレーション時の最初の描画では serverValue を、
 * その後の描画では getClientValue() の返り値を返す。
 *
 * 「useEffect で判定して setState する」書き方の置き換え。effect からの同期的な setState は
 * コミット直後にもう一度描画を走らせる(react-hooks/set-state-in-effect)。useSyncExternalStore
 * ならハイドレーションの不一致を起こさず、ハイドレーション直後に値が差し替わる。
 *
 * getClientValue は描画のたびに呼ばれるので、軽い判定(文字列の比較・matchMedia 程度)にとどめ、
 * プリミティブか参照の安定した値を返すこと(毎回新しいオブジェクトを返すと描画が止まらない)。
 * 後から変わり得る値(画面幅など)は subscribe で変化を通知させる。
 */
export function useClientValue<T>(
  getClientValue: () => T,
  serverValue: T,
  subscribe: (onChange: () => void) => () => void = subscribeNothing,
): T {
  return useSyncExternalStore(subscribe, getClientValue, () => serverValue);
}

// window の resize を購読する(useClientValue の subscribe に渡す)
export function subscribeWindowResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
