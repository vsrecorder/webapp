"use client";

import { cn, Modal as HeroUIModal, type ModalProps } from "@heroui/react";
import { useReducedMotion, type Variants } from "framer-motion";

/*
 * モーダルの出入りのアニメーションを差し替えた Modal。
 * アプリ内のモーダルはすべて @heroui/react ではなくこれを使う。
 *
 * HeroUI 既定の動きには次の問題があった。
 *
 *   1. 中央モーダルなのにモバイルでは拡縮が起きない(--scale-enter/--scale-exit が
 *      どちらも 100%)。出るときは実質フェードだけで、開いた手応えが無い。
 *   2. 入場と退場が非対称。入るときは動かないのに、閉じるときだけ 80px 下に落ちる。
 *      中央に出たものが下に流れて消えるので、どこへ片付いたのか分からない。
 *   3. 遅い。入場は 0.4s(y は spring 0.6s)、退場も 0.3s あり、開閉のたびに待たされる。
 *
 * 置き換えの方針は「入場は距離を持たせて静かに止め、退場は入場より一段速く」。
 *
 *   - 中央(center/top 系): 少し奥・少し下から迫り上がる scale + fade。最後に軽く
 *     行き過ぎて落ち着く spring にして、ダイアログが「乗ってくる」感触を出す。
 *   - 下寄せ(bottom): 画面外から滑り込むシート。iOS/Android のボトムシートに合わせ、
 *     弾ませず減速だけで着地させる。退場は同じ経路をそのまま下に戻す。
 *
 * 退場を極端に速くはしない。backdrop のフェードは HeroUI 内部で enter 0.4s /
 * exit 0.3s に固定されていて動かせないため、これより大きく先行させると
 * 「本体が消えたのに背景の暗幕だけ残る」ように見える。
 */

// HeroUI の TRANSITION_EASINGS と同じ値。単体で import できないため定数で持つ
const EASE_OUT = [0, 0, 0.2, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
// 序盤で一気に動いて終盤で滑り込む。iOS のシート表示に近い減速カーブ
const EASE_SHEET_OUT = [0.32, 0.72, 0, 1] as const;

// 中央に出るダイアログ(placement: center / top / auto など)
const dialogMotion: Variants = {
  enter: {
    scale: 1,
    y: 0,
    opacity: 1,
    transition: {
      // visualDuration は「見た目で止まったと感じるまで」の時間。
      // bounce と独立して指定できるので、弾みを足しても体感速度が変わらない
      scale: { type: "spring", visualDuration: 0.3, bounce: 0.18 },
      y: { type: "spring", visualDuration: 0.3, bounce: 0.18 },
      // 透明度まで弾ませると点滅して見えるので、こちらは時間指定で先に決着させる
      opacity: { duration: 0.15, ease: EASE_OUT },
    },
  },
  exit: {
    scale: 0.95,
    y: 12,
    opacity: 0,
    transition: { duration: 0.18, ease: EASE_IN },
  },
};

// 画面下端に貼り付くシート(placement: bottom)
const sheetMotion: Variants = {
  enter: {
    y: 0,
    opacity: 1,
    transition: {
      /*
       * wrapper は画面全体なので y:100% = 画面の高さぶん動く。
       * ここで spring を使うと、長い距離を指数的に収束する裾が残って
       * 「止まったように見えてから 200ms ほど数 px 動き続ける」状態になる
       * (実測で 585ms 時点でも 3.7px 残っていた)。時間指定にして停止を確定させる
       */
      y: { duration: 0.36, ease: EASE_SHEET_OUT },
      // 画面外から入ってくる途中で色が乗るように、フェードは短く済ませる
      opacity: { duration: 0.15, ease: EASE_OUT },
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      y: { duration: 0.24, ease: EASE_IN },
      opacity: { duration: 0.18, ease: EASE_IN },
    },
  },
};

// OS で視差効果を減らす設定をしている場合。位置や拡縮を動かさずフェードだけにする
const reducedMotion: Variants = {
  enter: { opacity: 1, transition: { duration: 0.12, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_IN } },
};

/*
 * 下寄せシート(placement: bottom)を画面下端に貼り付けるための打ち消し。
 *
 * HeroUI の base スロットは `my-1 sm:my-16` を持つ。呼び出し側はモバイル向けに
 * `my-0` を指定しているが、`sm:my-16` は別ブレークポイントなので tailwind-merge では
 * 消えず、sm(640px)以上——タブレットやデスクトップ——でだけ上下に 64px の余白が残る。
 * シートは下端に貼り付く前提(rounded-b-none)なので、下に隙間が空くと浮いて見える。
 *
 * classNames.base は className より前に連結される(cn(classNames.base, className))ため、
 * 個別に上下マージンを持たせたいモーダルは className 側で上書きできる。
 */
const BOTTOM_SHEET_BASE = "sm:my-0";

function getMotionVariants(placement: ModalProps["placement"], shouldReduceMotion: boolean) {
  if (shouldReduceMotion) return reducedMotion;

  // bottom は常に下端(モバイル/デスクトップとも items-end)なのでシート扱い。
  // auto と bottom-center はモバイルでだけ下端になるが、デスクトップでは中央に出る。
  // 画面高ぶんのスライドは中央表示では大げさなので、こちらはダイアログ側に寄せておく
  return placement === "bottom" ? sheetMotion : dialogMotion;
}

export function Modal({ motionProps, placement, classNames, ...props }: ModalProps) {
  // 端末の設定を尊重する。SSR 時は null(= 視差効果あり)になる
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <HeroUIModal
      {...props}
      placement={placement}
      classNames={
        placement === "bottom"
          ? { ...classNames, base: cn(BOTTOM_SHEET_BASE, classNames?.base) }
          : classNames
      }
      // 呼び出し側が明示した motionProps があればそちらを優先する
      motionProps={motionProps ?? { variants: getMotionVariants(placement, shouldReduceMotion) }}
    />
  );
}
