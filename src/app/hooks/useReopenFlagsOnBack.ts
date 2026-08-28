"use client";

import { useEffect } from "react";
import { isModalHistoryPushState } from "@app/utils/modalHistory";

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
      // このページから更に先へ進んだ場合は、戻ってきてもモーダルを再開しない。
      // ただしモーダル表示中のバック対策(useCloseModalOnBack)が積む戻り先は
      // ページ遷移ではないので、モーダルを開いただけでフラグを捨てないよう除外する
      if (!isModalHistoryPushState(args[0])) {
        for (const key of targetKeys) {
          sessionStorage.removeItem(`${PENDING_PREFIX}${key}`);
        }
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

/*
 * 戻り遷移でのモーダル再開を取りやめる。退避中のキーと元のキーの両方を消す。
 *
 * デッキを削除・アーカイブしたときのように、戻り先で開き直しても意味がない
 * (あるいは開いてはいけない)場合に、遷移の前に呼ぶ。とくに router.replace で移る場合は
 * pushState が呼ばれず、上のフックの「リンク遷移だからフラグを捨てる」判定が
 * 働かないため、ここで明示的に消しておかないとフラグが戻り先まで生き残る。
 */
export function clearReopenFlagsOnBack(keys: readonly string[]): void {
  for (const key of keys) {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`${PENDING_PREFIX}${key}`);
  }
}
