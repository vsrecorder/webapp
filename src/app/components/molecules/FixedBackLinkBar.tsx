"use client";

import BackLink from "@app/components/molecules/BackLink";

import { useFixedBarAlignment } from "@app/hooks/useFixedBarAlignment";

type Props = {
  href: string;
  label: string;
  ariaLabel?: string;
};

/*
 * スクロールしてもヘッダーの直下に残り続ける戻るリンク(BackLink)。
 * 縦に長い個別ページ(バトルレポートなど)で、下まで読んだあとも上へ戻らずに戻れるようにする。
 *
 * sticky ＋半透明の背景にはしない。iOS ではスクロールを別スレッドで処理するため sticky は
 * 固定のヘッダーより遅れて追従して揺れ、半透明だと下を流れる中身が透けて揺らいで見える。
 * 他の固定バーと同じく position:fixed ＋不透明な地色にして、流れの中に残した空き枠の実測で
 * 横位置・横幅を合わせる(useFixedBarAlignment。理由はそちらを参照)。
 *
 * ページの列の先頭に置く(列の上の余白はこのバーの pt-3 が持つ)。貼り付く位置はヘッダーの
 * 下端(〜lg 56px / lg〜 112px)ちょうどにして、ヘッダーとの間に中身が透けるすき間を作らない。
 * ページ先頭では空き枠の位置もヘッダーの下端なので、ハイドレーションの前後で中身は動かない。
 */
export default function FixedBackLinkBar({ href, label, ariaLabel }: Props) {
  const { slotRef, barRef, slotHeight } = useFixedBarAlignment();

  return (
    /* -mx-2 は <main> の p-2 を打ち消して端まで広げる(空き枠もこの中に置き、その幅をバーへ写す)。
       -mb-[9px] はバーの pb-2 と下線(1px)のぶん。ページ先頭で、下の中身がこれまでと同じ位置から始まるようにする。 */
    <div className="-mx-2 -mb-[9px]">
      {/* 流れの中に残す空き枠。fixed で抜けたバーの高さを埋める。既定の高さは 0
          (バーが fixed になるまではバー自身が流れの中で場所を取るため) */}
      <div ref={slotRef} aria-hidden style={{ height: slotHeight }} />

      {/* position は付けない。実測が入るまでは流れの中に置き、fixed 化は sync が行う。
          top-14/lg:top-28・z-40 は fixed になって初めて効く */}
      <div
        ref={barRef}
        className="app-dot-bg-plain top-14 z-40 border-b border-default-200/60 px-2 pt-3 pb-2 lg:top-28"
      >
        <BackLink href={href} label={label} ariaLabel={ariaLabel} />
      </div>
    </div>
  );
}
