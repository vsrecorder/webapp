"use client";

import { usePersistedFlag } from "@app/hooks/usePersistedFlag";
import {
  DEFAULT_EXCLUDE_DEFAULT_MATCHES,
  EXCLUDE_DEFAULT_MATCHES_COOKIE,
  EXCLUDE_DEFAULT_MATCHES_COOKIE_MAX_AGE,
  EXCLUDE_DEFAULT_MATCHES_KEY,
} from "@app/utils/excludeDefaultMatches";

/*
 * 不戦勝・不戦敗を戦績集計から外すかの設定を読み書きする。
 * トレーナー情報パネル・戦績分析パネル・月毎の勝率推移パネルが同じ設定を共有するため、
 * 読み書きはここに集める(方針は utils/excludeDefaultMatches)。
 *
 * initial にはサーバが cookie から読んだ値を渡す。保存・点滅の回避の仕組みは
 * hooks/usePersistedFlag を参照。
 */
export function useExcludeDefaultMatches(initial?: boolean): [boolean, () => void] {
  return usePersistedFlag(
    {
      storageKey: EXCLUDE_DEFAULT_MATCHES_KEY,
      cookieName: EXCLUDE_DEFAULT_MATCHES_COOKIE,
      cookieMaxAge: EXCLUDE_DEFAULT_MATCHES_COOKIE_MAX_AGE,
      defaultValue: DEFAULT_EXCLUDE_DEFAULT_MATCHES,
    },
    initial,
  );
}
