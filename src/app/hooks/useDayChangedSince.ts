"use client";

import { useState } from "react";

import { useTodayJST } from "@app/hooks/useTodayJST";

/*
 * key の表示を始めてから、端末の日付(JST)が変わったか。
 *
 * ホームの記録中カードが、開いたまま0時を迎えたときに消えるのに使う(取得に失敗していても
 * 消すための備え。ふだんは取得した日付で判定する。hooks/useRecordingNow)。
 * 「今日の記録か」はサーバの時計で決めてあるので、ここでは開催日と端末の日付を比べない。
 *
 * 起点は「描き始めたとき」なので、0時前に作られた描画結果を0時過ぎに描き始めた場合は
 * 見抜けない。それは取得した日付の側で拾う。
 *
 * 起点は key ごとに取り直す。翌日に別の記録が記録中になったとき、前の記録の起点のまま
 * 「日付が変わった」と判定して隠さないため。key が null のあいだは false。
 * (起点の day は key と同時に入るので、key が一致していれば必ず埋まっている)
 *
 * サーバ描画とハイドレーション中は日付が空文字なので起点を取らず false
 * (サーバが今日と判定して描いたものを、端末の日付を読む前に消さない)。
 */
export function useDayChangedSince(key: string | null): boolean {
  const today = useTodayJST();
  const [start, setStart] = useState<{ key: string | null; day: string }>({
    key: null,
    day: "",
  });

  if (key === null || today === "") return false;

  if (start.key !== key) {
    // 描画中に起点を入れる(前回値パターン)。React はこの描画を捨ててすぐ描き直す
    setStart({ key, day: today });
    return false;
  }

  return today !== start.day;
}
