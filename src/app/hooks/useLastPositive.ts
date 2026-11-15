"use client";

import { useState } from "react";

/*
 * 値が 0 以下になったら、直前の正の値を返し続ける。
 *
 * 件数バッジは 0 件になると消えるが、HeroUI の Badge は消えるときにフェードアウトするので、
 * そのまま件数を渡すとフェード中の約 0.1 秒「0」が見えてちらつく。
 * 消えている間は最後に表示していた件数を出しておくために使う。
 *
 * 前回値は state に控えて描画中に更新する(React 公式の「props の変化で state を調整する」型)。
 */
export function useLastPositive(value: number): number {
  const [last, setLast] = useState(value);

  if (value > 0 && value !== last) setLast(value);

  return value > 0 ? value : last;
}
