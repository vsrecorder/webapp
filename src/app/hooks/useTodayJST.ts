"use client";

import { useSyncExternalStore } from "react";

import { msUntilNextJSTMidnight, todayJSTDateString } from "@app/utils/date";

/*
 * 今日(JST)の暦日 "YYYY-MM-DD"。日付が変わると描き直す。
 *
 * 開きっぱなしの画面でも0時に切り替わるよう、次の0時にタイマーを張る。
 * 裏に回ったタブや止められていた PWA ではタイマーが遅れて鳴るので、画面へ戻ったときにも読み直す。
 * 値は暦日の文字列なので、読み直しても日付が同じなら描き直しは起きない。
 *
 * サーバと、ハイドレーション時の最初の描画では空文字(端末の時刻を描画に混ぜない)。
 */
function subscribe(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const schedule = () => {
    timer = setTimeout(() => {
      onChange();
      schedule();
    }, msUntilNextJSTMidnight());
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };

  schedule();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useTodayJST(): string {
  return useSyncExternalStore(subscribe, todayJSTDateString, () => "");
}
