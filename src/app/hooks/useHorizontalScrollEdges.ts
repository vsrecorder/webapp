"use client";

import { RefObject, useLayoutEffect, useState } from "react";

/*
 * 横スクロールする要素の、左右それぞれに隠れた中身があるか。
 *
 * 端に影を重ねて「まだ続きがある」ことを見せるのに使う。溢れていなければ両方 false。
 * 左は scrollLeft が 0 より先へ進んでいるとき、右は右端まで届いていないとき true。
 * 1px の余裕は、拡大表示などで scrollLeft が小数になり端に届き切らないことがあるため
 * (DeckVersionStats・WeeklyDeckUsageTrendPanel と同じ判定)。
 *
 * 測り直すのは、スクロールしたときと、要素・子要素の大きさが変わったとき。
 * 子要素まで見るのは、要素自身の幅は変わらず中身の幅だけが変わることがあるため
 * (カードリストのタブは、読み込み中の「??」から枚数に変わると幅が変わる。フォントの到着でも変わる)。
 * 描画前に測るので、開いた瞬間に影が遅れて出ることはない。
 */
export function useHorizontalScrollEdges(ref: RefObject<HTMLElement | null>): {
  left: boolean;
  right: boolean;
} {
  // 別々に持つのは、スクロールのたびに同じ値で更新しても再描画を起こさないため
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setLeft(el.scrollLeft > 1);
      setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();

    el.addEventListener("scroll", update, { passive: true });

    // jsdom などの ResizeObserver が無い環境では、スクロールでだけ測り直す
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (observer) {
      observer.observe(el);
      for (const child of Array.from(el.children)) observer.observe(child);
    }

    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [ref]);

  return { left, right };
}
