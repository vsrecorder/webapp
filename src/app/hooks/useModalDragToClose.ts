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
 *
 * 閉じる(onClose)とヘッダーごとこのリスナも unmount されて外れるため、ヘッダー側の
 * preventDefault() だけでは閉じたあとの指の動きを抑止できない(特に Android で顕著)。
 * そこで閉じる瞬間に document 側へ touchmove の抑止リスナを退避し、指を離す(touchend)まで
 * 既定のスクロール/フリングを止め続ける。→ suppressFlingUntilTouchEnd()
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

    /*
     * 閉じたあと、ヘッダー(touch-action:none)が unmount してこのリスナが外れても、
     * 指を離すまでブラウザの慣性スクロール(フリング)が始まらないように document 側で
     * touchmove を抑止し続ける。これが無いと Android では、閉じた直後のフリングが
     * 続く間、素早い次のタップが「フリング停止」に消費されて click が発火せず、
     * モーダルを開き直せない。触れているのはこのジェスチャの残りだけで、指を離せば
     * (touchend / touchcancel)直ちに解除するため、以降の操作には影響しない。
     */
    const suppressFlingUntilTouchEnd = () => {
      const onDocTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
      };
      const cleanup = () => {
        document.removeEventListener("touchmove", onDocTouchMove);
        document.removeEventListener("touchend", cleanup);
        document.removeEventListener("touchcancel", cleanup);
      };
      document.addEventListener("touchmove", onDocTouchMove, { passive: false });
      document.addEventListener("touchend", cleanup);
      document.addEventListener("touchcancel", cleanup);
    };

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
        // ヘッダーが消えたあとも指を離すまで既定動作を止め続ける(上記コメント参照)
        suppressFlingUntilTouchEnd();
        onCloseRef.current();
      }
    };

    // touchend だけでなく touchcancel(システムジェスチャの割り込み等)でもリセットする。
    // リセットが漏れると startY が残留し、次にヘッダー内のボタンへ触れたとき
    // (touchstart は早期 return するため残留値が生きたまま)touchmove が誤って
    // preventDefault・閉じ判定をしてしまう。
    const onTouchEnd = () => {
      startY.current = null;
    };

    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    node.addEventListener("touchcancel", onTouchEnd);

    detachRef.current = () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);
}
