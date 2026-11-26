"use client";

import { DatePicker, DatePickerProps } from "@heroui/react";
import { DateValue } from "@internationalized/date";

import { useHydrated } from "@app/hooks/useHydrated";

/*
 * ハイドレーションが済むまで実体を描かない DatePicker。
 *
 * react-aria の DateSegment は iOS でだけ role を spinbutton から textbox に変え、
 * aria-value* を落とす(useDateSegment の touchPropOverrides。VoiceOver が spinbutton に
 * フォーカスできないため)。この判定は User-Agent を見るだけで useIsSSR を通らないので、
 * サーバは必ず spinbutton、iOS のブラウザは textbox で描き、必ず食い違う。
 * 属性の不一致を React は直さない("This won't be patched up")ため、iOS では
 * 記録の作成・編集を開くたびにハイドレーションエラーが出ていた。
 *
 * 上流(adobe/react-spectrum #8503)が直るまで、サーバでは同じ高さの箱だけを描いて避ける。
 * 実体に差し替わるのはハイドレーション直後の1描画ぶん。高さは骨格
 * (RecordCreateFormSkeleton の EventDateSkeleton)と揃えてあるので、ここでレイアウトは動かない。
 */

// HeroUI の入力欄の高さ。骨格(EventDateSkeleton)と必ず同じ値にすること
const HEIGHT_BY_SIZE = { sm: "h-8", md: "h-10", lg: "h-12" } as const;

/*
 * カレンダー(ポップオーバー)の外側のタップは「閉じるだけ」にする(isNonModal: false)。
 *
 * HeroUI の DatePicker の既定は非モーダルで、外側のタップは閉じると同時に下の要素にも届いていた。
 * 記録作成ではカレンダーのすぐ外にタブ(公式イベント・Tonamel・自由形式)があり、閉じるつもりの
 * タップでタブが切り替わる。下部ナビに当たると画面ごと移動して、入力中の内容を失う。
 * アプリ内の他の吹き出し(AppPopover)と同じく、外側のタップは閉じるだけに揃える。
 *
 * 2026-11-26 にスマホ相当の画面(タッチ)で確認したこと:
 *   - タブ・下部ナビのリンク・ヘッダーのボタンへのすり抜けは止まる(もう1回押せば反応する)
 *   - react-select の欄(イベント・デッキ選択)へは止まらない。react-select は pointerdown で
 *     開くため。透明な層(resolveOverlayBackdrop)を足しても同じだったので、層は足していない
 *   - 外側から指でスクロールすると、これまでどおり閉じてページが動く。閉じなくなるのは
 *     カレンダーの上で指を動かしたときとホイールだけで、そのときカレンダーは日付欄についてくる
 *     (固定ヘッダーの上に重なって描かれるが、操作はできる)
 *   - 開いている間は背景が読み上げの対象から外れ、閉じると戻る。モーダル(イベント情報の変更)の
 *     中でも同じで、閉じたあとに aria-hidden やスクロールの禁止は残らない
 *
 * 呼び出し側が popoverProps を渡したときは、その値を後から重ねる(isNonModal も上書きできる)。
 */
const POPOVER_PROPS = { isNonModal: false } as const;

export default function HydratedDatePicker<T extends DateValue>(
  props: DatePickerProps<T>,
) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div
        className={`${HEIGHT_BY_SIZE[props.size ?? "md"]} w-full bg-default-100`}
        aria-hidden="true"
      />
    );
  }

  return <DatePicker {...props} popoverProps={{ ...POPOVER_PROPS, ...props.popoverProps }} />;
}
