"use client";

import { useFixedBarAlignment } from "@app/hooks/useFixedBarAlignment";

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
          高さの既定値は 0。バーが fixed になるまで（サーバ描画〜ハイドレーション）は
          バー自身が流れの中で場所を取るため、ここで埋めると二重になる。

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
        className="-mt-3 lg:-mt-17"
        style={{ height: slotHeight }}
      />
      {/* 半透明にすると下を流れるカードが透けて揺らいで見えるため、背景は不透明にする。
          地色はページのドット背景と同じにして、境目が出ないようにする。
          position は付けない。実測が入るまでは流れの中に置き、幅を親（＝カード列と
          同じ枠）から決めさせる。fixed 化は sync が行う（理由はそちらのコメント）。
          top-25 / z-40 は fixed になって初めて効くので、先に書いておいてよい。 */}
      <div ref={barRef} className="app-dot-bg-plain top-25 z-40 py-2">
        {children}
      </div>
    </div>
  );
}
