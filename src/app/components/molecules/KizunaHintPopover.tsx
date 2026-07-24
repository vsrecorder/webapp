"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { LuInfo } from "react-icons/lu";

/*
 * 「きずなとは？」の入口と、その説明の吹き出し。
 *
 * デッキ一覧のカードには、きずなLv.の数値・線・スプライトの灯と揺れが出るが、
 * それが何なのかはどこにも書いていない。数値の隣に説明への入口をひとつ置く。
 *
 * 吹き出しの作りはヘッダーの対戦環境（CurrentEnvironment）と揃える。
 *   backdrop         … 全面を覆う層でタップを受け止める（層タップで閉じる）
 *   shouldBlockScroll… スクロール抑止（iOS は react-aria が touchmove も抑止する）
 *   isNonModal={false}… 背面を aria-hidden にしてフォーカス移動も封じる
 *   disableAnimation … 閉→即再オープンの死に窓を消す（理由は CurrentEnvironment 参照）
 *
 * 層を敷くのはカードの上に置くため。層が無いと、吹き出しの外を触って閉じる操作が
 * そのままカードのタップ（＝デッキ情報モーダルを開く）になってしまう。
 * トリガー自身のタップも同じ理由で、置く側が伝播を止める必要がある。
 *
 * なお HeroUI の Popover は aria-modal を付けないため、モーダル用のグローバルな
 * 背面固定フック(useModalBackgroundScrollLock)は作動しない。
 *
 * 逆に、この吹き出しを HeroUI Modal の中で開くときは作りを変える必要がある。
 * Modal の外側クリック判定（react-aria の useInteractOutside）は document の
 * キャプチャフェーズで pointerdown を見るため、body 直下に portal される吹き出し内の
 * タップが「モーダルの外側」とみなされ、背面のモーダルごと閉じてしまう（実測で確認）。
 * その場合は backdrop を外し、PopoverContent に data-react-aria-top-layer を付ける。
 */
export default function KizunaHintPopover() {
  return (
    <Popover
      placement="bottom"
      offset={8}
      showArrow
      backdrop="opaque"
      shouldBlockScroll
      isNonModal={false}
      disableAnimation
    >
      <PopoverTrigger>
        {/*
          印は丸アイコンひとつ。文言を添えると幅を 98px 取ってしまい、
          リスト形式で隣の段階名（「心を許している」）が truncate される。
          そのかわり余白でしっかり当たり判定を稼ぐ。ここを詰めると
          20px 角にしかならず、指のタップが 12px ずれるだけで外れる
          （実測。指の接地中心は狙った位置から10px前後ずれる）。
          横は行が横長なので広めに取り（44px）、縦は -my-1.5 で相殺して
          行の見た目の高さを変えずに広げる（32px）。
        */}
        <button
          type="button"
          aria-label="きずなの説明を表示"
          className="-my-1.5 flex shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-default-400 active:opacity-70"
        >
          <LuInfo className="text-xs" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="px-3 py-3">
        {/* 画面幅いっぱいまで広がらないよう、折り返し幅を決めておく */}
        <div className="flex max-w-64 flex-col gap-2 text-left">
          <span className="font-bold text-amber-500 text-small dark:text-amber-400">
            きずな
          </span>

          {/* 日本語の文章を JSX に直に書くと、整形で行が折れた位置に半角スペースが入る
              （「組み直した回数、 そして」のように読点の後だと特に目立つ）。
              文字列リテラルにして、折り返し位置に文面が左右されないようにする。 */}
          <p className="text-tiny leading-relaxed text-default-600">
            そのデッキと
            <span className="font-bold">どう歩んできたか</span>
            {"を表す数値です（0〜255）。勝率は一切含みません。"}
          </p>

          <p className="text-tiny leading-relaxed text-default-600">
            {
              "会場へ連れて行った日数、どんな舞台に立ったか、書き残したメモ、組み直した回数、そして勝てない時期も使い続けたか。この6つから決まります。"
            }
          </p>

          <p className="text-tiny leading-relaxed text-default-600">
            {
              "ポケモンの灯と揺れも、きずなの段階で変わります。内訳はデッキ詳細ページで見られます。"
            }
          </p>

          {/* 算出方法は暫定であり、同じ記録でも数値が変わりうる。
              数値に触れる画面には必ず明記する（DeckKizunaPanel と同じ）。 */}
          <p className="text-[10px] leading-relaxed text-default-400">
            きずなはβ版のため、算出方法は今後変更される場合があります。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
