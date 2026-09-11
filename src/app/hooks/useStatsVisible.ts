"use client";

import { usePersistedFlag } from "@app/hooks/usePersistedFlag";
import {
  DEFAULT_STATS_VISIBLE,
  STATS_VISIBLE_COOKIE,
  STATS_VISIBLE_COOKIE_MAX_AGE,
  STATS_VISIBLE_KEY,
} from "@app/utils/statsVisible";

/*
 * トレーナー情報パネルの戦績を表示するかの設定を読み書きする(方針は utils/statsVisible)。
 *
 * initial にはサーバが cookie から読んだ値を渡す。保存・点滅の回避の仕組みは
 * hooks/usePersistedFlag を参照。
 */
export function useStatsVisible(initial?: boolean): [boolean, () => void] {
  return usePersistedFlag(
    {
      storageKey: STATS_VISIBLE_KEY,
      cookieName: STATS_VISIBLE_COOKIE,
      cookieMaxAge: STATS_VISIBLE_COOKIE_MAX_AGE,
      defaultValue: DEFAULT_STATS_VISIBLE,
    },
    initial,
  );
}
