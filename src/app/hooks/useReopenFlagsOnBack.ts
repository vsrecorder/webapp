"use client";

import { useEffect } from "react";

// 退避先のページ専用キーに付ける接頭辞。元のキーと衝突しないよう固定の接頭辞を使う。
const PENDING_PREFIX = "pendingReopenOnBack:";

/*
 * 遷移先ページで「戻り遷移のときだけ」モーダル再開フラグを生き残らせるための共通フック。
 *
 * マウント時に対象キーをページ専用キーへ退避しておき、ナビバー等のリンク遷移
 * (router.push → pushState)が発生した場合は退避したキーを削除する。
 * スワイプバック・ブラウザバック(popstate)では pushState が呼ばれないためキーはそのまま残り、
 * アンマウント時に元のキーへ復元することで、バック遷移時のみモーダルが再開する。
 *
 * 記録詳細ページ(RecordById)は記録側のキーも絡む都合で同じ仕組みを個別に持っている。
 * こちらはデッキ詳細ページ・記録作成ページのように、渡されたキーをそのまま
 * 往復させれば足りる遷移先で使う。
 */
export function useReopenFlagsOnBack(keys: readonly string[]) {
  // 呼び出し側が配列リテラルを渡しても毎レンダー再実行されないよう、内容で依存を張る
  const keysKey = keys.join(",");

  useEffect(() => {
    const targetKeys = keysKey ? keysKey.split(",") : [];

    // 遷移してきた時点で立っているフラグを、このページの所有物として退避する
    for (const key of targetKeys) {
      const value = sessionStorage.getItem(key);
      if (value !== null) {
        sessionStorage.setItem(`${PENDING_PREFIX}${key}`, value);
        sessionStorage.removeItem(key);
      }
    }

    const originalPushState = window.history.pushState;
    window.history.pushState = function (
      ...args: Parameters<typeof window.history.pushState>
    ) {
      // このページから更に先へ進んだ場合は、戻ってきてもモーダルを再開しない
      for (const key of targetKeys) {
        sessionStorage.removeItem(`${PENDING_PREFIX}${key}`);
      }
      return originalPushState.apply(window.history, args);
    };

    return () => {
      window.history.pushState = originalPushState;

      for (const key of targetKeys) {
        const saved = sessionStorage.getItem(`${PENDING_PREFIX}${key}`);
        if (saved !== null) {
          // pushState が発生しなかった(＝バック遷移)場合のみここに来る
          sessionStorage.setItem(key, saved);
          sessionStorage.removeItem(`${PENDING_PREFIX}${key}`);
        }
      }
    };
  }, [keysKey]);
}
