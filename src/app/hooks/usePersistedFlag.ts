"use client";

import { useEffect } from "react";

import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import { writeLocalStorage } from "@app/utils/localStorageStore";
import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";

/*
 * 「端末ごとの表示設定」を localStorage に持ちつつ、サーバ描画にも効かせるための土台。
 *
 * localStorage はサーバで読めないので、同じ値を cookie にも書いてサーバへ渡す。
 * サーバは cookie から読んだ値を initial として渡し、この hook は localStorage を
 * 読めるまでそれを使う。これをやらないと最初の1フレームだけ既定値で描かれ、
 * 設定を変えている人には「一瞬だけ既定の見た目が出てから切り替わる」点滅になる。
 *
 * 3つとも揃っていないと点滅が残るので、まとめてここに置く:
 *   1. 読めない間はサーバから渡された値を使う
 *   2. 切り替えたら localStorage と cookie の両方を更新する
 *   3. 読み込み時に食い違っていたら cookie を localStorage に合わせる
 *      (この仕組みより前から設定している端末は cookie を持たないため。
 *       これが無いと「既に設定を変えている人」=点滅が見える人だけ直らない)
 *
 * 使う側は utils 側に鍵・cookie 名・既定値をまとめ、専用の hook から呼ぶこと
 * (hooks/useExcludeDefaultMatches・hooks/useStatsVisible)。
 */
export type PersistedFlagStorage = {
  // localStorage の鍵。値は "true" / "false"
  storageKey: string;
  // サーバへ見せるための cookie 名。値は localStorage と同じ文字列
  cookieName: string;
  cookieMaxAge: number;
  // 未保存のときの値
  defaultValue: boolean;
};

// 保存値を設定へ戻す。cookie は誰でも書き換えられるので、想定外の値は既定に倒す
function decode(raw: string | null, defaultValue: boolean): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return defaultValue;
}

export function usePersistedFlag(
  storage: PersistedFlagStorage,
  // サーバが cookie から読んだ値。cookie が無ければ undefined(既定に従う)
  initial?: boolean,
): [boolean, () => void] {
  const { storageKey, cookieName, cookieMaxAge, defaultValue } = storage;
  const stored = useLocalStorageItem(storageKey);

  // 保存済みの値が読めればそれが正。読めない間(サーバ・ハイドレーション)は
  // サーバが cookie から読んだ値、それも無ければ既定。
  const value =
    stored !== null ? decode(stored, defaultValue) : (initial ?? defaultValue);

  useEffect(() => {
    if (stored === null) return;
    if (readClientCookie(cookieName) === stored) return;

    writeClientCookie(cookieName, stored, cookieMaxAge);
  }, [stored, cookieName, cookieMaxAge]);

  const toggle = () => {
    const next = String(!value);
    writeLocalStorage(storageKey, next);
    writeClientCookie(cookieName, next, cookieMaxAge);
  };

  return [value, toggle];
}
