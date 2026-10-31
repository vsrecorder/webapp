"use client";

import { cn } from "@heroui/react";

import { useFixedBarAlignment } from "@app/hooks/useFixedBarAlignment";

type Props = {
  children: React.ReactNode;
  // バー(中身の並べ方や上の余白)に足すクラス。既定は px-2 pt-2 pb-[7px]。下の余白(pb)は指定しないこと(下記)
  className?: string;
};

/*
 * ヘッダーの直下に貼り付くバー(個別ページの戻るリンクとシェアの列など)の入れ物。
 * 列(flex-col)の先頭に置き、中身は children で受け取る。サーバコンポーネントからも使える。
 *
 * position:sticky にはしない。理由は 2 つ。
 *
 *   1. メニュー・吹き出し・モーダルを開くと、react-aria(usePreventScroll)が html に
 *      overflow:hidden を付ける。Chromium ではこれだけで背面の sticky が貼り付きを失い、
 *      フロー位置へ戻って画面外に飛ぶ(デッキ詳細で 180px スクロールしてメニューを開くと、
 *      戻るバーの上端が 56px → -124px になり、閉じると戻る。実測)。暗幕越しにバーが
 *      消えて戻るのが見える。
 *   2. iOS はスクロールを別スレッドで処理するため、sticky は固定のヘッダーより遅れて
 *      追従して揺れ、半透明の背景だと下を流れる中身が透けて揺らぐ。
 *
 * 他の固定バーと同じく position:fixed ＋不透明な地色にし、流れの中に残した空き枠の実測で
 * 横位置・横幅を合わせる(useFixedBarAlignment。理由はそちらを参照)。
 *
 * 貼り付く位置はヘッダーの下端(〜lg 56px / lg〜 112px)。ページ先頭では空き枠もそこから
 * 始まるようにしておくと(列の上の余白はこのバーの上の余白で持つ)、
 * ハイドレーションの前後で中身は 1px も動かない。
 *
 * 高さは sticky だった頃(上下 8px の余白、下線は重ねた層に描いていた)と同じにする。
 * 下線(1px)はバー自身の border なので箱の高さに入る。そのぶん下の余白を 1px 減らす(pb-[7px])。
 * 呼び出し側が pb を上書きすると高さが変わるので、上の余白(pt)だけを指定する。
 */
export default function PinnedBar({ children, className }: Props) {
  const { slotRef, barRef, slotHeight } = useFixedBarAlignment();

  return (
    /* -mx-2 は <main> の p-2 を打ち消して端まで広げる(空き枠もこの中に置き、その幅をバーへ写す)。
       data-pinned-bar / data-pinned-bar-box は見た目には関係しない。検証(位置の実測)で固定バーを
       見つけるための目印 */
    <div className="-mx-2" data-pinned-bar="">
      {/* 流れの中に残す空き枠。fixed で抜けたバーの高さを埋める。既定の高さは 0
          (バーが fixed になるまではバー自身が流れの中で場所を取るため) */}
      <div ref={slotRef} aria-hidden style={{ height: slotHeight }} />

      {/* position は付けない。実測が入るまでは流れの中(static)に置き、fixed 化は sync が行う。
          top-14/lg:top-28・z-40 は fixed になって初めて効く。relative にしてはいけない。
          relative は top を反映するので、ハイドレーション前の HTML でバーが 56px 下にずれて描かれる。
          地色はページのドット背景と同じ .app-dot-bg-plain にして継ぎ目を出さない */}
      <div
        ref={barRef}
        className={cn(
          "app-dot-bg-plain top-14 z-40 border-b border-default-200/60 px-2 pt-2 pb-[7px] lg:top-28",
          className,
        )}
        data-pinned-bar-box=""
      >
        {children}
      </div>
    </div>
  );
}
