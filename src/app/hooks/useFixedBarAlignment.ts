"use client";

import { useLayoutEffect, useRef, useState } from "react";

/*
 * 要素の「ページ先頭からの縦位置」。
 *
 * `getBoundingClientRect().top + window.scrollY` は使えない。モーダル表示中は
 * 背面のページ内容ラッパー([data-scroll-lock-root])が position:fixed かつ
 * top:-スクロール量 で固定される(useModalBackgroundScrollLock)。このとき文書の
 * スクロール範囲はビューポート寸法まで縮んで window.scrollY が 0 に折りたたまれる
 * 一方、要素自体はスクロール量ぶん上へずれているため、両者を足しても実際の位置に
 * ならない(スクロール量ぶん小さく出る)。
 *
 * offsetTop の積み上げは固定された側の座標系の中で完結するので、背面固定中でも
 * 通常時と同じ値が出る。fixed な祖先はページの流れから外れている(その top は
 * ページ内の位置ではなく固定位置)ため、そこで積み上げを打ち切る。
 */
function pageTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;

  while (node) {
    top += node.offsetTop;

    const parent = node.offsetParent as HTMLElement | null;
    if (!parent || getComputedStyle(parent).position === "fixed") break;

    node = parent;
  }

  return top;
}

/*
 * 画面上部に固定表示するバーの「横位置合わせ」。
 *
 * position:sticky はスクロール量に応じて毎フレーム位置が決まるため、iOS のように
 * スクロールを別スレッドで処理する環境では固定タブ(position:fixed)より遅れて追従し、
 * 上下に揺れて見える。そこで上のタブと同じ position:fixed に揃えて、
 * スクロール量から完全に切り離す。
 *
 * ただし fixed はレイアウトの流れから外れるので、横幅・横位置を自分で決める必要がある。
 * ここでは「流れの中に残した空き枠(slot)」の実測値をバーへ写すことで解決する。
 * <main> の左右余白(ログイン状態やブレークポイントで変わる)や lg:max-w-4xl を
 * 書き写さずに済み、将来それらが変わってもデッキカードの列と必ず揃う。
 *
 * 位置の再計算はリサイズ時だけで、スクロール中は何もしない。
 */
export function useFixedBarAlignment() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  // 空き枠に確保する高さ。バーの実測値を入れて、抜けたぶんのズレを埋める。
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const bar = barRef.current;
    if (!slot || !bar) return;

    const sync = () => {
      /*
       * 実測が入るこの瞬間に、流れの中から固定へ切り替える。
       *
       * サーバ描画〜ハイドレーションの間はまだ実測値が無く、fixed のままだと
       * 横幅・横位置を自分で決められない。ビューポート全幅で代用すると、
       * 〜lg では <main> の左右余白ぶん(8px)、lg 以上ではサイドバーと
       * lg:max-w-4xl ぶん(実測で片側192px以上)はみ出したバーが見えてしまう。
       * 流れの中に置いておけば幅は親から決まるので、その間もカード列と必ず揃う。
       *
       * 切り替えは useLayoutEffect のためペイント前に済み、移動は目に見えない。
       */
      if (bar.style.position !== "fixed") bar.style.position = "fixed";

      const rect = slot.getBoundingClientRect();
      const left = `${rect.left}px`;
      const width = `${rect.width}px`;
      // 同じ値の書き戻しは ResizeObserver のループ警告を招くので避ける
      if (bar.style.left !== left) bar.style.left = left;
      if (bar.style.width !== width) bar.style.width = width;

      /*
       * 空き枠の縦位置を、バーの貼り付き位置に合わせて持ち上げる。
       *
       * 空き枠は「上の余白ぶん下」から始まるが、バーは常に top-25 に貼り付く。
       * 揃えないと、ページ最上部にいるときだけバーが空き枠より上にずれ、
       * バーとカードの間隔がスクロール開始の瞬間に詰まって見える。
       * ずれ量は余白の合計（ヘッダー・タブぶん）から決まるので、
       * 数値を書き写さずに実測の差から求める。
       *
       * 空き枠の位置はスクロール量に依存しない pageTop で測る。詳細はその定義を参照。
       */
      slot.style.marginTop = "0px";
      const slotPageTop = pageTop(slot);
      // fixed なのでバーの top はビューポート基準＝ページ先頭から見た貼り付き位置
      const barPinnedTop = bar.getBoundingClientRect().top;
      slot.style.marginTop = `${barPinnedTop - slotPageTop}px`;

      // 高さは横幅を当てたあとに測る(幅が決まらないと折り返しで変わるため)
      const height = bar.offsetHeight;
      setSlotHeight((prev) =>
        prev !== undefined && Math.abs(prev - height) < 0.5 ? prev : height,
      );
    };

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(slot);
    observer.observe(bar);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return { slotRef, barRef, slotHeight };
}
