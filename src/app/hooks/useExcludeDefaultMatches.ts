"use client";

import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import { writeLocalStorage } from "@app/utils/localStorageStore";
import {
  EXCLUDE_DEFAULT_MATCHES_KEY,
  toExcludeDefaultMatches,
} from "@app/utils/excludeDefaultMatches";

/*
 * 不戦勝・不戦敗を戦績集計から外すかの設定を読み書きする。
 * トレーナー情報パネルと戦績分析パネルが同じ設定を共有するため、読み書きはここに集める
 * (詳細は utils/excludeDefaultMatches)。
 *
 * サーバ描画とハイドレーション時の最初の描画では localStorage を読めないので、
 * どちらも既定値になる(useLocalStorageItem)。保存済みの値はその後の描画で反映される。
 */
export function useExcludeDefaultMatches(): [boolean, () => void] {
  const excluded = toExcludeDefaultMatches(
    useLocalStorageItem(EXCLUDE_DEFAULT_MATCHES_KEY),
  );

  const toggle = () => {
    writeLocalStorage(EXCLUDE_DEFAULT_MATCHES_KEY, String(!excluded));
  };

  return [excluded, toggle];
}
