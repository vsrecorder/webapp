"use client";

import { useCallback, useRef } from "react";

type Options = {
  // true の間はドラッグを受け付けない(処理中に閉じられると困るモーダル向け)
  disabled?: boolean;
};

// 閉じると判定する下方向の移動量(px)
const CLOSE_THRESHOLD = 30;

/*
 * ボトムシート型モーダルの「ヘッダーを下にドラッグして閉じる」を提供する。
 * 戻り値を ModalHeader の ref に渡して使う。
 *
 * touchmove を「非パッシブ」で登録して preventDefault() する必要があるため、
 * React の onTouchMove ではなく ref から直接リスナを登録している。
 *
 * React の onTouchMove はパッシブリスナとして登録されるため preventDefault() が
 * 効かない。preventDefault() しないと、閉じた瞬間に touch-action:none を持つ
 * ヘッダーが DOM から消え、ブラウザは残りの指の動きをページスクロールとみなす。
 * 指を弾いて離すとそのままフリックの慣性が始まり、慣性が続く約0.5秒間、次のタップは
 * 「慣性を止める操作」に消費されて click が発火しない。その結果、閉じた直後に
 * 背後のカードやボタンをタップしても反応せず、二度目のタップまで開けなくなる。
 */
export function useModalDragToClose(onClose: () => void, { disabled = false }: Options = {}) {
  const startY = useRef<number | null>(null);

  // リスナ内から常に最新の値を参照できるようにする(リスナの付け直しを避けるため)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const detachRef = useRef<(() => void) | null>(null);

  return useCallback((node: HTMLElement | null) => {
    detachRef.current?.();
    detachRef.current = null;

    if (!node) return;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;

      // ヘッダー内のボタン等のタップはドラッグとして扱わない。
      // touchmove を preventDefault() すると、指が僅かに動いただけで
      // ボタンの click が発火しなくなるため、ドラッグ領域の押下のみを対象にする。
      if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;

      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (disabledRef.current) return;

      if (e.cancelable) e.preventDefault();

      if (e.touches[0].clientY - startY.current > CLOSE_THRESHOLD) {
        startY.current = null;
        onCloseRef.current();
      }
    };

    const onTouchEnd = () => {
      startY.current = null;
    };

    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);

    detachRef.current = () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}
