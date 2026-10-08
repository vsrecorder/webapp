"use client";

import { writeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * 「戻ってきたら開き直す/スクロールする」対象(sessionStorage)を、別のページへ進む直前に書く。
 *
 * 対象を読む一覧やカードは、値を描画中に購読している(useSessionStorageItem)。進む直前に
 * 普通に書くと、遷移が終わるまで画面に残っている「元の」一覧がその場で受け取り、開き直して
 * 対象を消してしまう。進んだ先にも戻ってきた一覧にも何も残らず、戻っても元の状態に
 * ならなかった(2026-09-08 に描画中に購読する形へ変えてから。2026-10-08 に報告)。
 *
 * そこで、この関数で書いた順番をキーごとに控えておき、読み手(useReturnTargetItem)は
 * 「自分が現れた後に、この関数で書かれた値」だけを無視する。戻ってきて新しく現れた読み手は
 * 普通に受け取る。記録詳細ページが離れるときに書き戻す値のような、普通の書き込み
 * (writeSessionStorage)には従来どおりその場で追随する。
 *
 * 控えはモジュールの変数なので、ページを読み込み直すと消える(読み手もすべて新しくなるので問題ない)。
 */

let markSequence = 0;
const markedAt = new Map<string, number>();

// 進む直前に対象を書く。null で消すのは普通の writeSessionStorage でよい
export function writeReturnTarget(key: string, value: string): void {
  markSequence += 1;
  markedAt.set(key, markSequence);
  writeSessionStorage(key, value);
}

// 今の書き込みの番号。読み手が現れた時点の値を控えるのに使う
export function currentReturnTargetSequence(): number {
  return markSequence;
}

// key が、sequence の時点より後にこの関数で書かれたか
export function isReturnTargetMarkedAfter(key: string, sequence: number): boolean {
  return (markedAt.get(key) ?? 0) > sequence;
}
