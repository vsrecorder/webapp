"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

/*
 * 長押しを検知するフック。返す handlers を押下対象の「包み要素」に付ける。
 *
 * 中身が HeroUI の Button(react-aria の usePress)だと、pointerdown などは
 * usePress が stopPropagation するので、祖先の通常のハンドラには届かない。
 * そのため捕捉(capture)フェーズで拾う。
 *
 * 長押しが成立したあと指を離すと、中の Button の onPress(タップ扱い)も発火しうる。
 * タップ側の処理の先頭で consumeLongPress() を呼び、true なら何もしないこと。
 */

// 長押しと見なすまでの時間。OS の長押し(コンテキストメニュー等)とおおむね揃える
export const LONG_PRESS_DELAY_MS = 500;
// この距離を超えて指が動いたらスクロールなどとみなして取り消す
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

type Options = {
  // false のあいだは何も検知しない(閲覧専用の表示など)
  enabled?: boolean;
  delay?: number;
  moveTolerance?: number;
};

export function useLongPress(
  onLongPress: () => void,
  {
    enabled = true,
    delay = LONG_PRESS_DELAY_MS,
    moveTolerance = LONG_PRESS_MOVE_TOLERANCE_PX,
  }: Options = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  // 最新のコールバックを控えておく(タイマー発火時点のものを呼ぶため)
  const onLongPressRef = useRef(onLongPress);
  useLayoutEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  // アンマウント時にタイマーを残さない
  useEffect(() => cancel, [cancel]);

  const onPointerDownCapture = (e: PointerEvent) => {
    if (!enabled) return;
    // マウスは主ボタンだけ(右クリック等は対象外)
    if (e.pointerType === "mouse" && e.button !== 0) return;

    cancel();
    firedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      startRef.current = null;
      firedRef.current = true;
      // 対応端末(主に Android)では軽く振動させて、長押しが効いたことを伝える
      navigator.vibrate?.(10);
      onLongPressRef.current();
    }, delay);
  };

  const onPointerMoveCapture = (e: PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > moveTolerance) {
      cancel();
    }
  };

  // Android の長押しで出るコンテキストメニューを抑える
  const onContextMenu = (e: MouseEvent) => {
    if (enabled) e.preventDefault();
  };

  // 直前の押下が長押しとして成立していたら true を返し、状態を戻す。
  // タップ側の処理はこれが true のとき何もしない
  const consumeLongPress = useCallback(() => {
    const fired = firedRef.current;
    firedRef.current = false;
    return fired;
  }, []);

  return {
    handlers: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture: cancel,
      onPointerCancelCapture: cancel,
      onContextMenu,
    },
    consumeLongPress,
  };
}
