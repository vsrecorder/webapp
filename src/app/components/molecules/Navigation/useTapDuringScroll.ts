import { useEffect, useRef, type MouseEvent, type TouchEvent } from "react";

/*
 * スクロール中(慣性で流れている最中)にナビ項目を押しても遷移しない問題への対処。
 *
 * iOS の Safari も Android の Chrome も、慣性スクロール中の最初のタッチは「スクロールを止める」
 * ために使い、そのタッチからは click を発火させない。ナビは <Link> の click で遷移するので、
 * ページを流しながらナビを押すとスクロールが止まるだけで何も起きなかった。
 * touchstart / touchend 自体は届くので、スクロール中に始まったタップに限って touchend で遷移させる。
 *
 * スクロールしていないときは何もせず、これまでどおり click(Link)に任せる。
 * スクロールの止め際は click が出ることもあるので、touchend で遷移させた直後の click は
 * 打ち消して二重に遷移させない(Link は onClick の後で defaultPrevented を見て遷移をやめる)。
 */

// 最後の scroll イベントからこの時間内に始まったタッチを「スクロール中のタッチ」とみなす。
// 慣性の流れ始めは毎フレーム scroll が出るが、止まり際は 1px 動くのに数フレームかかり間が空く。
// 広めに取っても、止まった後のタップは click と重ならないよう打ち消すので害はない。
export const SCROLL_ACTIVE_MS = 300;

// 指がこれ以上動いたらタップではなくスクロールの操作とみなす。
// CardListAccordion・useModalDragToClose の TAP_SLOP と同じ 16px
// (Android の Chrome は約 8px 動くまで touchmove を送らないので、それより小さくはしない)。
export const TAP_SLOP_PX = 16;

// これより長く押したものは長押し(リンクのメニュー)として扱い、遷移させない
export const TAP_MAX_DURATION_MS = 500;

// touchend で遷移させた後、この時間内に来た click は同じタップの click とみなして打ち消す
const CLICK_SUPPRESS_MS = 1000;

export type TapGesture = {
  startX: number;
  startY: number;
  startedAt: number;
  // タッチを始めた時点で、最後に scroll イベントが出た時刻(一度も出ていなければ null)
  lastScrollAt: number | null;
};

// スクロール中に始まり、ほとんど動かず短く離したタッチか
export function isTapDuringScroll(
  gesture: TapGesture,
  end: { x: number; y: number; at: number },
): boolean {
  if (gesture.lastScrollAt == null) return false;
  if (gesture.startedAt - gesture.lastScrollAt > SCROLL_ACTIVE_MS) return false;
  if (end.at - gesture.startedAt > TAP_MAX_DURATION_MS) return false;
  return (
    Math.abs(end.x - gesture.startX) < TAP_SLOP_PX && Math.abs(end.y - gesture.startY) < TAP_SLOP_PX
  );
}

export function useTapDuringScroll(onTap: (href: string) => void) {
  const lastScrollAtRef = useRef<number | null>(null);
  const gestureRef = useRef<TapGesture | null>(null);
  const handledAtRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      lastScrollAtRef.current = performance.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 各ナビ項目に渡すハンドラ
  function handlersFor(href: string) {
    return {
      onTouchStart(e: TouchEvent) {
        // 前のタップの click は(出るなら)このタッチより前に出ている。ブラウザが click を
        // 出さなかったときに控えが残り、次の普通のタップの click まで打ち消さないよう捨てる。
        handledAtRef.current = null;
        if (e.touches.length !== 1) {
          gestureRef.current = null;
          return;
        }
        const touch = e.touches[0];
        gestureRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startedAt: performance.now(),
          lastScrollAt: lastScrollAtRef.current,
        };
      },
      onTouchCancel() {
        gestureRef.current = null;
      },
      onTouchEnd(e: TouchEvent) {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        const touch = e.changedTouches[0];
        if (gesture == null || touch == null) return;

        const now = performance.now();
        if (!isTapDuringScroll(gesture, { x: touch.clientX, y: touch.clientY, at: now })) return;

        handledAtRef.current = now;
        onTap(href);
      },
      onClick(e: MouseEvent) {
        const handledAt = handledAtRef.current;
        if (handledAt == null) return;
        handledAtRef.current = null;
        if (performance.now() - handledAt < CLICK_SUPPRESS_MS) e.preventDefault();
      },
    };
  }

  return { handlersFor };
}
