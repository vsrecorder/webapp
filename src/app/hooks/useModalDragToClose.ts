"use client";

import { useCallback, useRef } from "react";

type Options = {
  // true の間はドラッグを受け付けない(処理中に閉じられると困るモーダル向け)
  disabled?: boolean;
  // false にするとシート全体(ボディ/フッター)のドラッグでは閉じず、ヘッダーのドラッグだけにする。
  // 入力フォームのように、意図せず閉じると入力内容が消えるモーダル向け(既定: true)
  sheet?: boolean;
};

// ヘッダーのドラッグで閉じると判定する下方向の移動量(px)
const CLOSE_THRESHOLD = 30;

// シート内部(ボディ/フッター)のドラッグで閉じると判定する下方向の移動量(px)。
// 掴みバーのあるヘッダーと違い意図せず触れやすいので、少し引っ張った程度では閉じないよう大きめにする
const SHEET_CLOSE_THRESHOLD = 90;

/*
 * シート内部(ボディ等)のドラッグで「縦か横か / 上か下か」を決める移動量(px)。
 * これに達するまでは preventDefault() せず、判定も保留する。
 *
 * 小さめにしている理由: Chrome(Android)はタッチスロップ(約8px)を超えるまで touchmove を
 * 配送せず、最初の touchmove を preventDefault() しなければスクロールを開始して以降の
 * touchmove を cancelable=false にする。判定がスロップより遅いと、下ドラッグでも
 * スクロールに横取りされて閉じられなくなる。
 */
const DIRECTION_SLOP = 5;

/*
 * 「タップの指ぶれ」と「意図したドラッグ」を分ける下方向の移動量(px)。
 * ここを超えて初めて押下(press)を取り消し、指を離したときの click も止める。
 *
 * 方向判定(DIRECTION_SLOP)と同時に取り消してはいけない。DIRECTION_SLOP は
 * Chrome(Android)のタッチスロップより小さく、最初の touchmove が届いた時点で既に
 * 超えていることがある。そこで押下を消すと、チップやボタンを普通にタップしただけでも
 * 「押したのに何も起きない」ことになる。閉じる判定(SHEET_CLOSE_THRESHOLD)まで
 * 引き延ばすのも駄目で、そこに届かなかったドラッグが最後にタップとして発火してしまう。
 */
const TAP_SLOP = 16;

// 先頭とみなすスクロール位置の上限(px)。ラバーバンド戻りの端数を先頭扱いにする
const SCROLL_TOP_EPSILON = 1;

// シート内部のドラッグ対象から外す要素(キャレット移動・選択ハンドル操作と競合するため)
const TEXT_ENTRY_SELECTOR =
  "input, textarea, select, [contenteditable=''], [contenteditable='true']";

/*
 * data-sheet-drag="ignore" を付けた要素(とその配下)から始まったドラッグでは閉じない。
 * 例: 記録情報モーダルの3点メニュー表示中に被せるオーバーレイ(DisplayRecordModal)。
 * ヘッダー側のドラッグには影響しない。
 */
const IGNORE_SELECTOR = '[data-sheet-drag="ignore"]';

type SheetGesture = {
  x: number;
  y: number;
  target: Element;
  // pending: 方向未確定 / drag: 下ドラッグ確定(以降の touchmove は preventDefault する)
  mode: "pending" | "drag";
  // TAP_SLOP を超えて「タップではない」と判断し、押下と click を取り消したか
  cancelled: boolean;
};

/*
 * ボトムシート型モーダルの「下にドラッグして閉じる」を提供する。
 * 戻り値を ModalHeader の ref に渡して使う。
 *
 * 2つの領域で動く:
 * 1. ヘッダー(ref を渡した要素): touch-action:none 前提で、触れた瞬間からドラッグ扱い。
 * 2. シート全体(ヘッダーから辿った role="dialog" の要素 = HeroUI の base スロット):
 *    ボディやフッターの上でも、内容が先頭までスクロールされた状態で下へ動かせば閉じる。
 *    横方向の動き(HScrollRow / Tabs)や上方向のスクロール、スクロール途中の要素上から
 *    始まった動きはブラウザのスクロールに委ねる。ヘッダー上の操作は 1 に任せ二重に扱わない。
 *    options.sheet = false で無効化でき、data-sheet-drag="ignore" を付けた要素上からは始まらない。
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
export function useModalDragToClose(
  onClose: () => void,
  { disabled = false, sheet = true }: Options = {},
) {
  const startY = useRef<number | null>(null);

  // リスナ内から常に最新の値を参照できるようにする(リスナの付け直しを避けるため)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const sheetEnabledRef = useRef(sheet);
  sheetEnabledRef.current = sheet;

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

    const close = () => {
      // 閉じた要素が消えたあとも指を離すまで既定動作を止め続ける(上記コメント参照)
      suppressFlingUntilTouchEnd();
      onCloseRef.current();
    };

    // ---------------------------------------------------------------------
    // 1. ヘッダー: 触れた瞬間からドラッグ扱い
    // ---------------------------------------------------------------------

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
        close();
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

    const detachHeader = () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };

    // ---------------------------------------------------------------------
    // 2. シート全体: 内容が先頭のときの下ドラッグで閉じる
    // ---------------------------------------------------------------------

    // HeroUI の ModalContent はダイアログ本体(base スロット)に role="dialog" を付ける。
    // ヘッダー・ボディ・フッターをまとめて覆えるのはこの要素なので、ここにリスナを付ける。
    const sheet =
      node.closest<HTMLElement>('[role="dialog"]') ?? node.parentElement;
    const detachSheet = sheet
      ? attachSheetDrag(sheet, node, { disabledRef, sheetEnabledRef }, close)
      : null;

    detachRef.current = () => {
      detachHeader();
      detachSheet?.();
    };
  }, []);
}

/*
 * 触れた要素からシートまでの間に、先頭以外までスクロールされた要素があるか。
 * あれば指の下方向の動きは「上へ戻すスクロール」なので閉じる対象にしない。
 * (ボディ自身だけでなく、ボディ内に入れ子のスクロール領域があっても同じ判定になる)
 */
function isScrolledDown(target: Element, sheet: HTMLElement) {
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (el.scrollTop > SCROLL_TOP_EPSILON) return true;
    if (el === sheet) break;
  }
  return false;
}

// 触れた要素が、折りたたまれていない(範囲を持つ)テキスト選択の中にあるか
function isInsideSelection(target: Element) {
  const selection = target.ownerDocument.getSelection();
  return !!selection && !selection.isCollapsed && selection.containsNode(target, true);
}

/*
 * ブラウザがスクロールを横取りしたときと同じく、押下中の要素の press を取り消す。
 *
 * 下ドラッグを確定すると touchmove を preventDefault() するためブラウザはスクロールを
 * 始めず、スクロール開始時に発火するはずの pointercancel も出ない。すると react-aria の
 * usePress(HeroUI の Button / isPressable な Card / Link)は押下中のままとなり、閾値に
 * 届かず指を離したとき、指がまだ要素上にあれば onPress が発火して「ドラッグしただけで
 * 開く」ことになる。usePress は document の pointercancel で押下を取り消すので、
 * 同等の合成イベントを流して従来(スクロール横取り時)と同じ結果にそろえる。
 *
 * ただしこれを呼ぶのは「もうタップではない」と言い切れてから(TAP_SLOP)にする。
 * usePress は押下を取り消されたあとに来た click に対して、onPress を発火しないまま
 * stopPropagation() だけを実行する。早く呼びすぎると、指ぶれ程度のタップで
 * 押下も click も消え、祖先に置いた onClick まで巻き添えで届かなくなる。
 */
function cancelPress(target: Element) {
  if (typeof PointerEvent !== "function") return;
  target.dispatchEvent(
    new PointerEvent("pointercancel", {
      bubbles: true,
      cancelable: false,
      pointerType: "touch",
    }),
  );
}

/*
 * 指を離したときに発火する click を1回だけ握りつぶす。
 *
 * cancelPress() が効くのは react-aria の usePress を使う要素だけで、素の onClick を
 * 持つ要素(タグのチップなど)には効かない。下ドラッグ中は touchmove を preventDefault()
 * していてブラウザがスクロールを始めないため、そのままだと引っ張って戻しただけで
 * click が発火し「ドラッグしたのに押された」ことになる。
 *
 * capture フェーズで止めるので React のハンドラには届かない。次の操作(touchstart)が
 * 始まれば、このジェスチャの click はもう来ないので直ちに手を引く。時間切れは
 * ブラウザがタップと見なさず click を出さなかった場合の後始末。
 */
function suppressNextClick(doc: Document) {
  let timer = 0;

  function cleanup() {
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("touchstart", cleanup, true);
    window.clearTimeout(timer);
  }

  function onClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    cleanup();
  }

  doc.addEventListener("click", onClick, true);
  doc.addEventListener("touchstart", cleanup, true);
  timer = window.setTimeout(cleanup, 400);
}

function attachSheetDrag(
  sheet: HTMLElement,
  header: HTMLElement,
  {
    disabledRef,
    sheetEnabledRef,
  }: { disabledRef: { current: boolean }; sheetEnabledRef: { current: boolean } },
  close: () => void,
) {
  let gesture: SheetGesture | null = null;

  const onTouchStart = (e: TouchEvent) => {
    gesture = null;
    if (disabledRef.current || !sheetEnabledRef.current) return;
    // ピンチ(2本指)はズーム操作なので対象外
    if (e.touches.length !== 1) return;

    // テキストノードが target になる環境もあるため Element に限定する(closest を安全に呼ぶ)
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    // ヘッダー上は従来のハンドラ(触れた瞬間からドラッグ)に任せる
    if (header.contains(target)) return;
    if (target.closest(TEXT_ENTRY_SELECTOR)) return;
    if (target.closest(IGNORE_SELECTOR)) return;
    // 選択中のテキストに触れた場合は選択範囲の調整(ハンドルのドラッグ)なので対象外。
    // iOS はこの操作でも touchmove を配送するため、preventDefault すると調整できなくなる
    // (react-aria の usePreventScroll も同じ理由で除外している)
    if (isInsideSelection(target)) return;
    if (isScrolledDown(target, sheet)) return;

    gesture = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      target,
      mode: "pending",
      cancelled: false,
    };
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!gesture) return;
    // cancelable=false はブラウザが既にスクロールを始めた合図。以降は関与しない
    if (disabledRef.current || e.touches.length !== 1 || !e.cancelable) {
      gesture = null;
      return;
    }

    const dx = e.touches[0].clientX - gesture.x;
    const dy = e.touches[0].clientY - gesture.y;

    if (gesture.mode === "pending") {
      // 方向が決まるまでは何もしない。ここで preventDefault() すると、指が僅かに揺れた
      // だけのタップでも click が失われる
      if (Math.abs(dx) < DIRECTION_SLOP && Math.abs(dy) < DIRECTION_SLOP) return;

      // 横方向(横スクロール行・タブ)と上方向(内容のスクロール)はブラウザに任せる
      if (Math.abs(dx) >= Math.abs(dy) || dy < 0) {
        gesture = null;
        return;
      }

      gesture.mode = "drag";
    }

    e.preventDefault();

    /*
     * ここまで動いたらタップではないので、押下と、指を離したときの click を取り消す。
     * 方向を確定した時点(DIRECTION_SLOP)ではまだ取り消さない。そこはタップの指ぶれと
     * 区別が付かず、押しただけのチップやボタンが無反応になるため(TAP_SLOP のコメント参照)。
     */
    if (!gesture.cancelled && dy > TAP_SLOP) {
      gesture.cancelled = true;
      cancelPress(gesture.target);
      suppressNextClick(gesture.target.ownerDocument);
    }

    if (dy > SHEET_CLOSE_THRESHOLD) {
      gesture = null;
      close();
    }
  };

  const onTouchEnd = () => {
    gesture = null;
  };

  sheet.addEventListener("touchstart", onTouchStart, { passive: true });
  sheet.addEventListener("touchmove", onTouchMove, { passive: false });
  sheet.addEventListener("touchend", onTouchEnd);
  sheet.addEventListener("touchcancel", onTouchEnd);

  return () => {
    sheet.removeEventListener("touchstart", onTouchStart);
    sheet.removeEventListener("touchmove", onTouchMove);
    sheet.removeEventListener("touchend", onTouchEnd);
    sheet.removeEventListener("touchcancel", onTouchEnd);
  };
}
