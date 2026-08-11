"use client";

import { useLayoutEffect, useRef, useState } from "react";

/*
 * 要素の「ページ先頭からの縦位置」。
 *
 * `getBoundingClientRect().top + window.scrollY` は使えない。モーダル表示中は
 * 背面のアプリルート(body > [data-overlay-container])が position:fixed かつ
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
function useFixedBarAlignment() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  // 空き枠に確保する高さ。バーの実測値を入れて、抜けたぶんのズレを埋める。
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const bar = barRef.current;
    if (!slot || !bar) return;

    const sync = () => {
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

/*
 * リスト/ギャラリー切り替えバーの「入れ物」。
 *
 * 中身（読み込み中はスケルトン、読み込み後は実際のトグル）だけを差し替えられるよう
 * 分けてある。Suspense の fallback (decks/loading.tsx) と実体 (Decks.tsx) の双方が
 * これを使うことで、両者のバーの位置・高さ・空き枠が構造的に必ず一致する。
 *
 * 以前は fallback 側がバーを通常フローに置いていたため、実体へ切り替わった瞬間に
 * バーが fixed の貼り付き位置(top-25)へ跳び、同時にカード一覧も下へずれていた
 * （実測でバーが12px上・一覧が8px下）。同じ骨格を共有してこのズレを無くしている。
 */
export default function DeckViewToggleBar({ children }: { children: React.ReactNode }) {
  const { slotRef, barRef, slotHeight } = useFixedBarAlignment();

  return (
    <div className="w-full">
      {/* 流れの中に残す空き枠。バーの横位置・横幅の基準になり、
          同時に fixed で抜けたぶんの高さを埋めてカードの重なりを防ぐ。
          h-12 はバーの実寸(py-2 16px＋トグル32px)と同じ既定値で、
          実測が入るまで（サーバ描画〜ハイドレーション）の高さを埋める。

          負の上マージンは、実測で入る marginTop（バーの貼り付き位置 top-25＝100px と、
          空き枠が流れの中で本来始まる位置との差）の既定値。これが無いと
          ハイドレーションで marginTop が入った瞬間に一覧が跳ねる。
          値は上の余白の合計から決まり、ブレークポイントで変わる:
            〜lg : pt-14(56) + pt-12(48) + pt-2(8) = 112px → 100-112 = -12px(-mt-3)
            lg〜 : pt-28(112) + pt-12(48) + pt-2(8) = 168px → 100-168 = -68px(-mt-17)
          lg では空き枠の高さが 0 に潰れる（バーがコンテンツ開始位置より上にあり、
          重ならないので押し下げる必要が無い）。
          あくまで近似で、ハイドレーション後は実測値が上書きする。
          上の余白（Layout の pt-14/lg:pt-28 や pt-12）を変えるときはここも合わせること。 */}
      <div
        ref={slotRef}
        aria-hidden
        className="-mt-3 h-12 lg:-mt-17"
        style={{ height: slotHeight }}
      />
      {/* 半透明にすると下を流れるカードが透けて揺らいで見えるため、背景は不透明にする。
          地色はページのドット背景と同じにして、境目が出ないようにする。
          left-0 right-0 は実測が入るまでの仮の横幅。無いと横幅が内容依存に縮んで
          ハイドレーション前だけバーが潰れて見える（実測後はインラインの left/width が勝つ）。 */}
      <div
        ref={barRef}
        className="app-dot-bg-plain fixed top-25 right-0 left-0 z-40 py-2"
      >
        {children}
      </div>
    </div>
  );
}
