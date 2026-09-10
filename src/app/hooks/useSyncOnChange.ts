"use client";

import { useState } from "react";

/*
 * source が変わったときに sync を「描画中に」呼ぶ。
 * React の「前回の描画の情報を保存する」パターン
 * (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
 * を1箇所にまとめたもの。
 *
 * 主な用途はモーダルの入力欄の入れ直し。effect で入れ直すと前回の値での描画が一度挟まり、
 * 開いた瞬間に前回の入力が見えてしまうため、描画中に入れ直す。
 *
 *   useSyncOnChange({ isOpen, deck }, () => {
 *     if (isOpen && deck) setName(deck.name);
 *   });
 *
 * 初回の描画では必ず sync を呼ぶ。ここが要点で、「マウント時の source」を初期値にすると
 * source が最初から一致してしまい、同期が一度も走らないケースが生まれる。
 * デッキ詳細モーダル(ShowDeckModal)や記録詳細モーダル(DisplayRecordModal)は
 * createLazyModal 経由で「開かれた瞬間にマウント」されるので、その中のモーダルは
 * 対象データが既にある状態でマウントされる。実際にデッキ情報の更新で、デッキ名が
 * 空欄のまま更新できてしまい API が400を返す不具合が起きた。
 * sync 側は「まだ開いていない・データが無い」場合に何もしないよう書くこと(上の例の
 * isOpen && deck)。そうしておけば初回に呼ばれても害はない。
 *
 * source は浅く比較する。参照が安定している値(props やその一次プロパティ)を並べること。
 * 毎描画で作り直される配列・オブジェクトは、中身を表す文字列にしてから渡す。
 */
export function useSyncOnChange<T extends Record<string, unknown>>(
  source: T,
  sync: () => void,
): void {
  // null は「まだ一度も同期していない」。T 自体を null にできる型ではないので、
  // 未同期の表現として安全に使える。
  const [previous, setPrevious] = useState<T | null>(null);

  if (previous === null || !shallowEqual(previous, source)) {
    setPrevious(source);
    sync();
  }
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);

  if (keys.length !== Object.keys(b).length) {
    return false;
  }

  return keys.every((key) => Object.is(a[key], b[key]));
}
