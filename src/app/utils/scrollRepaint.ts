"use client";

import { flushSync } from "react-dom";

/*
 * スクロール領域の先頭付近で要素が増減したときに、iOS(WebKit)だけで起きる
 * 2つの症状への対策をまとめたユーティリティ。
 *
 * 1. 表示位置がずれる (applyWithScrollCompensation)
 *    Chrome(Android)などはスクロールアンカリングを持ち、先頭側で高さが変わっても
 *    見えている位置がずれないようスクロール位置を自動補正する。iOS Safari は
 *    これを実装していないため、要素が増えたぶんだけ中身が下へずれてしまう。
 *    (減る方向は、最下部までスクロールしていれば溢れなくなったぶんの切り詰めで
 *     結果的に位置が保たれるため、増える方向だけ症状として現れやすい)
 *
 * 2. 変化前の描画が残る (forceRepaint)
 *    上記のスクロール位置の変化はユーザー操作によるスクロールではないため、
 *    iOS では調整だけが反映されて再描画が走らないことがあり、変化前の描画が
 *    残ったまま重なって見える。指で少しスクロールすると正しく描き直される。
 *
 * どちらも Linux版WebKit(Playwright)や Chromium では再現せず実機でのみ現れる。
 */

// スクロール量の比較で使う許容値。HeroUI の Card/CardBody は既定で
// overflow-y:auto を持つが実際には溢れていないため、丸め誤差ぶんの差で
// 「スクロールコンテナ」と誤検出しないようにする。
const OVERFLOW_TOLERANCE_PX = 1;

// この量までのズレは補正しない。サブピクセルの丸めで生じる 1px 未満の差で
// スクロール位置を触らないようにする。
const COMPENSATION_THRESHOLD_PX = 1;

/*
 * 指定要素の祖先をたどり、実際にスクロールしているコンテナを返す。
 * 見つからない場合(＝ページ自体がスクロール領域)は null を返す。
 */
export function findScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;

  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    const scrollable = overflowY === "auto" || overflowY === "scroll";
    if (scrollable && node.scrollHeight - node.clientHeight > OVERFLOW_TOLERANCE_PX) {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

/*
 * anchor の画面上の位置を保ったまま apply()(＝スクロール領域の高さを変える更新)を
 * 適用する。スクロールアンカリングを持たない iOS Safari でも表示がずれない。
 *
 * 「増えたぶんだけスクロールする」のような決め打ちの補正にはしない。
 * アンカリングを持つブラウザ(Chrome/Android など)では二重補正になって、
 * 今度は逆方向へ同じだけずれてしまうため。代わりに apply() の前後で anchor の
 * 画面座標を実測し、実際にずれたぶんだけ戻す。ブラウザ側が既に補正していれば
 * 差はほぼ 0 になり、何もしない。
 *
 * apply() は flushSync で同期的に反映する。描画される前に測って戻すため、
 * 「一度ずれて見えてから直る」というチラつきは起きない。
 */
export function applyWithScrollCompensation(
  anchor: HTMLElement | null,
  apply: () => void,
): void {
  const container = anchor
    ? (findScrollContainer(anchor) ?? document.scrollingElement)
    : null;

  if (!anchor || !container) {
    apply();
    return;
  }

  const topBefore = anchor.getBoundingClientRect().top;
  flushSync(apply);
  // getBoundingClientRect() はレイアウトを確定させるため、ブラウザ側の
  // アンカリング補正が入る場合はこの時点で反映済みになる。
  const topAfter = anchor.getBoundingClientRect().top;

  const shift = topAfter - topBefore;
  if (Math.abs(shift) >= COMPENSATION_THRESHOLD_PX) container.scrollTop += shift;
}

/*
 * 指定要素とその配下の再描画を明示的に要求する。
 *
 * visibility は「再描画だけを必要とする」プロパティで、かつ子孫に継承されるため、
 * 切り替えるとその要素以下の描画内容が破棄されて描き直される(合成レイヤーに
 * 残った古い描画もここで捨てられる)。同一タスク内で元へ戻すため途中の状態は
 * 一度も描画されず、レイアウト・スクロール位置・フォーカスも変化しない
 * (WebKit の「表示されなくなった要素からフォーカスを外す」処理は強制レイアウトでは
 * 走らず次の描画更新まで行われないことを、Playwright/WebKit で実測して確認済み)。
 */
export function forceRepaint(el: HTMLElement | null): void {
  if (!el) return;

  const previous = el.style.visibility;

  el.style.visibility = "hidden";
  // 強制的にスタイル再計算・レイアウトまで進めて上の変更を確定させる。
  // これが無いと2回の変更が相殺されて、再描画が要求されないことがある。
  void el.offsetHeight;
  el.style.visibility = previous;
}
