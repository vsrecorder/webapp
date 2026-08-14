"use client";

/*
 * iOS(WebKit)で「スクロール領域の中身が縮んだのに描き直されない」症状への対策。
 *
 * スクロール領域の先頭付近にある要素が消えると、ブラウザは見えている位置が
 * ずれないようにスクロール位置を自分で調整する(スクロールアンカリング。
 * 最下部までスクロールしている場合は、溢れなくなったぶんの切り詰めも重なる)。
 * この調整はユーザー操作によるスクロールではないため、iOS Safari では調整だけが
 * 反映されて再描画が走らないことがあり、縮む前の描画が残ったままズレて重なって
 * 見える。指で少しスクロールすると正しく描き直される。
 *
 * Linux版WebKit(Playwright)やChromiumでは再現せず実機でのみ現れるため、
 * 縮んだ後に再描画を明示的に要求して、古い描画を確実に捨てさせる。
 */

// スクロール量の比較で使う許容値。HeroUI の Card/CardBody は既定で
// overflow-y:auto を持つが実際には溢れていないため、丸め誤差ぶんの差で
// 「スクロールコンテナ」と誤検出しないようにする。
const OVERFLOW_TOLERANCE_PX = 1;

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
