"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";

/*
 * 吹き出し(カレンダーなど)の外側のタップを受け止める、透明な層。
 *
 * 吹き出しを開いている間、画面全体を覆って吹き出しのすぐ下に入る。外側のタップはこの層に
 * 当たるので、下の要素(タブ・リンク・入力欄)には何も届かない。層に触れたら onDismiss を呼ぶ。
 *
 * なぜ層が要るか(2026-11-27 に確認):
 * HeroUI の吹き出しは isNonModal: false にすると、外側の pointerdown と click を document の
 * 捕捉段階で止める。ところが吹き出しは pointerdown の時点で閉じ始め、止める仕組みも閉じる
 * アニメーション(約 170ms)と一緒に消える。指を離すのがそれより遅いと、click は止められずに
 * 下の要素へ届く。人のタップは 100〜300ms かかるので、実機ではカレンダーの外のタブが
 * 切り替わった。作業機(タッチの模擬)でも、220ms 以上のタップで下部ナビのリンクへ届いて画面が
 * 移動した(60〜120ms では止まるので、短いタップだけの確認では見つからない)。
 * touchend を見ている react-select の欄には、短いタップでも届いていた。
 * イベントを止めるのではなく、タップそのものを層に当てれば、長さや端末に関係なく届かない。
 *
 * 層は、閉じるきっかけになったタップが終わるまで残す(isHeld)。
 * click の当たり先は指を離した時点で決まるので、閉じると同時に層を消すと、長いタップの click が
 * 下の要素に当たる。click が来たら消す。来なかったとき(長押し・スクロールへの切り替え)のために、
 * 指が離れてから CLICK_GRACE_MS、触れてから HOLD_LIMIT_MS でも消す。
 *
 * 属性とイベントの扱い:
 *   - data-react-aria-top-layer: body 直下へ portal しているので、react-aria から見るとこの層は
 *     「モーダルの外側」になる。付けないと、編集モーダルの中でカレンダーの外をタップしたときに
 *     モーダルまで閉じる(ScreenLockLoading と同じ理由)
 *   - stopPropagation: React のイベントは portal を越えて呼び出し元の親へ伝わる。記録カードの
 *     ような「タップで開く親」の中で使われても、親が反応しないようにする
 *   - mousedown の preventDefault: パソコンで外側を押したとき、フォーカスが body へ逃げない
 *     ようにする(閉じたあと、フォーカスは開いたボタンへ戻る)
 */

// 吹き出し(react-aria の useOverlayPosition)は z-index: 100000 で描かれる。そのすぐ下に入れる。
// 固定ヘッダー・下部ナビ・モーダル(いずれも z-50)よりは上になる
const SHIELD_Z_INDEX = 99999;

// 指を離してから click が届くまで待つ時間。iOS は click を少し遅らせることがある
export const CLICK_GRACE_MS = 400;

// 触れたまま、の上限。長押しは click にならないので、いつまでも残さない
export const HOLD_LIMIT_MS = 1500;

type Props = {
  // 吹き出しが開いているか
  isOpen: boolean;
  // 外側に触れたとき(閉じる処理を呼び出し側で行う)
  onDismiss: () => void;
};

export default function OutsideTapShield({ isOpen, onDismiss }: Props) {
  // この層で始まったタップが、まだ終わっていない
  const [isHeld, setIsHeld] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const release = useCallback(() => {
    clearTimer();
    setIsHeld(false);
  }, [clearTimer]);

  const releaseAfter = useCallback(
    (ms: number) => {
      clearTimer();
      timerRef.current = setTimeout(release, ms);
    },
    [clearTimer, release],
  );

  useEffect(() => clearTimer, [clearTimer]);

  if (!isOpen && !isHeld) return null;
  if (typeof document === "undefined") return null;

  const stop = (e: SyntheticEvent) => e.stopPropagation();

  return createPortal(
    <div
      data-slot="outside-tap-shield"
      data-react-aria-top-layer="true"
      aria-hidden="true"
      className="fixed inset-0"
      style={{ zIndex: SHIELD_Z_INDEX, WebkitTapHighlightColor: "transparent" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsHeld(true);
        releaseAfter(HOLD_LIMIT_MS);
        onDismiss();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (isHeld) releaseAfter(CLICK_GRACE_MS);
      }}
      onPointerCancel={(e) => {
        // ブラウザがスクロールなどに切り替えた。このあと click は来ない
        e.stopPropagation();
        release();
      }}
      onClick={(e) => {
        e.stopPropagation();
        release();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseUp={stop}
      onTouchStart={stop}
      onTouchEnd={stop}
    />,
    document.body,
  );
}
