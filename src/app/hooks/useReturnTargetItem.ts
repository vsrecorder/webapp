"use client";

import { useState } from "react";

import { useSessionStorageItem } from "@app/hooks/useSessionStorageItem";
import {
  currentReturnTargetSequence,
  isReturnTargetMarkedAfter,
} from "@app/utils/returnTarget";

/*
 * 「戻ってきたら開き直す/スクロールする」ための sessionStorage の対象を読む。
 *
 * useSessionStorageItem と同じく描画中に購読するが、この部品が現れた後に
 * writeReturnTarget(別のページへ進む直前の書き込み)で書かれた値は null として扱う。
 * 進む直前の対象を、まだ画面に残っている元の一覧が受け取って消さないようにするため
 * (理由は utils/returnTarget を参照)。それ以外の書き込みには従来どおり追随する。
 *
 * サーバ描画とハイドレーション時の最初の描画では null(useSessionStorageItem と同じ)。
 */
export function useReturnTargetItem(key: string): string | null {
  const value = useSessionStorageItem(key);
  // 現れた時点の書き込みの番号
  const [sequenceAtMount] = useState(currentReturnTargetSequence);

  return isReturnTargetMarkedAfter(key, sequenceAtMount) ? null : value;
}
