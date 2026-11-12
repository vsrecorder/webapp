import type { AccordionItemProps } from "@heroui/react";

/*
 * HeroUI の AccordionItem に渡す開閉アニメーション(motionProps)。アコーディオンには必ずこれを渡す。
 *
 * HeroUI の既定は、開き始めた瞬間に枠(section)の overflow-y を hidden から unset へ切り替える。
 * 高さは 0 から伸びていく途中なので、中身がそのままの高さで枠からはみ出し、
 * スクロールできる量(scrollHeight)だけが最初の1フレームで増える。その結果:
 *
 *   - 開いて末尾までスクロール → 閉じる → 開き直す、で Chrome が閉じる前のスクロール位置を
 *     1フレームで戻す。枠はまだ高さ 0 なので、位置だけ飛んでから中身が伸びてくる
 *     (実測: 高さ 0px のまま 264px 進む。ページでもモーダルでも起きる)
 *   - はみ出した中身が、下に続く要素の上へ薄く重なって見える
 *   - 行き先を scrollHeight から出すスクロール処理が、最初のフレームで行き先まで飛ぶ
 *
 * 開いている途中は overflow-y: clip で枠の中に収め、開き切ってから unset に戻す。
 * これで scrollHeight は枠の伸びどおりに増える(モーダルでは位置の戻りも枠の伸びに沿う)。
 *
 * hidden ではなく clip にする理由: 片方の軸を hidden にすると、もう片方の visible が auto に
 * 計算される。iOS のモーダルは「overflow が auto なのに溢れていない要素」から始まるスワイプを
 * 殺すので、開いている間じゅう中身の上でスクロールできなくなる。clip はもう片方の軸を変えない。
 * 開き切ったあと unset に戻すのは、中身のフォーカスリングや影を切らないため(HeroUI の既定と同じ)。
 *
 * 高さと不透明度の動きは HeroUI の既定(TRANSITION_VARIANTS.collapse)と同じ値。
 */
export const ACCORDION_MOTION_PROPS: NonNullable<AccordionItemProps["motionProps"]> = {
  variants: {
    enter: {
      opacity: 1,
      height: "auto",
      overflowY: "clip",
      transition: {
        height: { type: "spring", bounce: 0, duration: 0.3 },
        opacity: { duration: 0.4 },
      },
      transitionEnd: { overflowY: "unset" },
    },
    exit: {
      opacity: 0,
      height: 0,
      overflowY: "hidden",
      transition: { duration: 0.3 },
    },
  },
};
