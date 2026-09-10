"use client";

import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import { writeLocalStorage } from "@app/utils/localStorageStore";
import { writeClientCookie } from "@app/utils/clientCookie";
import {
  DEFAULT_EXCLUDE_DEFAULT_MATCHES,
  EXCLUDE_DEFAULT_MATCHES_COOKIE,
  EXCLUDE_DEFAULT_MATCHES_COOKIE_MAX_AGE,
  EXCLUDE_DEFAULT_MATCHES_KEY,
  toExcludeDefaultMatches,
} from "@app/utils/excludeDefaultMatches";

/*
 * 不戦勝・不戦敗を戦績集計から外すかの設定を読み書きする。
 * トレーナー情報パネル・戦績分析パネル・月毎の勝率推移パネルが同じ設定を共有するため、
 * 読み書きはここに集める(詳細は utils/excludeDefaultMatches)。
 *
 * initial には、サーバが cookie から読んだ値を渡す。サーバ描画とハイドレーション時の
 * 最初の描画では localStorage を読めない(useLocalStorageItem が null を返す)ので、
 * 渡さないとその一瞬だけ既定値で描いてしまう。外している端末ではトグルが有効の見た目で
 * 描かれてから外れる、という点滅になる。cookie が無い初回訪問だけ既定になる。
 *
 * 書き込みは localStorage と cookie の両方へ行う。cookie 側を忘れると次の読み込みで
 * また点滅が戻るため、書き込み口はこの1箇所に閉じてある。
 */
export function useExcludeDefaultMatches(initial?: boolean): [boolean, () => void] {
  const stored = useLocalStorageItem(EXCLUDE_DEFAULT_MATCHES_KEY);

  // 保存済みの値が読めればそれが正。読めない間(サーバ・ハイドレーション)は
  // サーバが cookie から読んだ値、それも無ければ既定。
  const excluded =
    stored !== null
      ? toExcludeDefaultMatches(stored)
      : (initial ?? DEFAULT_EXCLUDE_DEFAULT_MATCHES);

  const toggle = () => {
    const next = String(!excluded);
    writeLocalStorage(EXCLUDE_DEFAULT_MATCHES_KEY, next);
    writeClientCookie(
      EXCLUDE_DEFAULT_MATCHES_COOKIE,
      next,
      EXCLUDE_DEFAULT_MATCHES_COOKIE_MAX_AGE,
    );
  };

  return [excluded, toggle];
}
