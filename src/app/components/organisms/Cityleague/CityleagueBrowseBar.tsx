"use client";

import { useFixedBarAlignment } from "@app/hooks/useFixedBarAlignment";

/*
 * 過去の結果を探す軸チップ(シーズン/環境/開催月/大型大会)のバーの入れ物。
 *
 * 以前は sticky top-25 ＋ bg-white/90 backdrop-blur-md だったが、これは
 * /decks の切り替えバーで潰したのと同じ「スクロール中に揺らぐ」問題を抱えていた。
 *
 *   1. 半透明＋ぼかし … バー自体は静止していても、下を流れるカードが透けて動く。
 *      実測(修正前)でバー領域のピクセルが 12px スクロールするたびに
 *      36〜64% 変化していた（モバイル 390px / デスクトップ 1280px）。
 *   2. sticky … スクロール量から毎フレーム位置が決まるので、iOS のように
 *      スクロールを別スレッドで処理する環境では、すぐ上のリーグ種別タブ
 *      （position:fixed）より遅れて追従し、上下に揺れて見える。
 *
 * 対処はタブと同じ position:fixed に揃え、背景を不透明にすること。
 * fixed は流れから外れて横幅・横位置を自分で決める必要があるが、数値を書き写すと
 * <main> の余白（ログイン状態とブレークポイントで変わる）とズレるため、
 * 流れの中に空き枠を残してその実測 rect をバーへ写す（useFixedBarAlignment）。
 *
 * 中身のリンクはサーバコンポーネント（CityleagueBrowseSection）のまま children で
 * 受け取る。この入れ物だけがクライアントに載るので、リンクは従来どおり HTML に載る。
 */
export default function CityleagueBrowseBar({ children }: { children: React.ReactNode }) {
  const { slotRef, barRef, slotHeight } = useFixedBarAlignment();

  return (
    /* -mx-2 は <main> の p-2 を打ち消して端まで広げるための既存の指定。
       空き枠もこの中に置くことで、実測される横幅＝これまでのバーの横幅になる。 */
    <div className="-mx-2">
      {/* 流れの中に残す空き枠。バーの横位置・横幅の基準になり、
          同時に fixed で抜けたぶんの高さを埋めて本文の潜り込みを防ぐ。
          高さの既定値は 0（バーが fixed になるまではバー自身が場所を取るため）。

          負の上マージンは、実測で入る marginTop（バーの貼り付き位置と、空き枠が
          流れの中で本来始まる位置との差）の既定値。これが無いとハイドレーションで
          marginTop が入った瞬間に一覧が跳ねる。値は上の余白の合計から決まる:
            〜lg : pt-14(56) + pt-12(48) = 104px → top-25(100)  - 104 =  -4px(-mt-1)
            lg〜 : pt-28(112) + pt-12(48) = 160px → lg:top-38(152) - 160 = -8px(-mt-2)
          実測値と一致することを確認済み。あくまで近似で、ハイドレーション後は
          実測値が上書きする。上の余白（Layout の pt-14/lg:pt-28 や pt-12）や
          top-25/lg:top-38 を変えるときはここも合わせること。 */}
      <div ref={slotRef} aria-hidden className="-mt-1 lg:-mt-2" style={{ height: slotHeight }} />

      {/* 背景は不透明にする（半透明だと下を流れるカードが透けて揺らぐ）。
          地色はページのドット背景と同じ .app-dot-bg-plain にして継ぎ目を出さない。
          backdrop-blur を外したので、iOS の standalone PWA 対策で分けていた
          「絶対配置の背景レイヤー」も不要になり、バー自身に背景を持たせている。
          position は付けない。実測が入るまでは流れの中に置き、幅を親から決めさせる。
          fixed 化は sync が行う。top-25/lg:top-38・z-40 は fixed になって初めて効く。
          top はすぐ上のリーグ種別タブ（fixed）の下端に合わせた値。 */}
      <div
        ref={barRef}
        className="app-dot-bg-plain top-25 z-40 border-b border-default-200/60 lg:top-38"
      >
        {children}
      </div>
    </div>
  );
}
