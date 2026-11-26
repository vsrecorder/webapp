"use client";

import { cloneElement, isValidElement } from "react";

import {
  Button,
  Calendar,
  DateInput,
  DatePickerProps,
  FreeSoloPopover,
  TimeInput,
  useDatePicker,
} from "@heroui/react";
import { CalendarBoldIcon } from "@heroui/shared-icons";
import { DateValue } from "@internationalized/date";
import { AnimatePresence } from "framer-motion";

import OutsideTapShield from "@app/components/atoms/OutsideTapShield";
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
 * カレンダー(ポップオーバー)の外側のタップは「閉じるだけ」にする。
 *
 * HeroUI の DatePicker の既定は非モーダルで、外側のタップは閉じると同時に下の要素にも届く。
 * 記録作成ではカレンダーのすぐ外にタブ(公式イベント・Tonamel・自由形式)があり、閉じるつもりの
 * タップでタブが切り替わる。下部ナビに当たると画面ごと移動して、入力中の内容を失う。
 * アプリ内の他の吹き出し(AppPopover)と同じく、外側のタップは閉じるだけに揃える。
 *
 * やっていることは2つ:
 *   1. isNonModal: false(モーダルとして開く)。開いている間は背景が読み上げの対象から外れ、
 *      スクロールでは閉じなくなる(カレンダーは日付欄についてくる)
 *   2. カレンダーのすぐ下に透明な層(OutsideTapShield)を置き、外側のタップを層で受け止める
 *
 * 1 だけでは足りない(webapp #78 はこれだけで、実機ではすり抜けた)。HeroUI が外側のタップを
 * 止めていられるのは触れてから約 170ms の間だけで、それより長いタップの click は下へ届く。
 * 理由と層の動きは OutsideTapShield のコメントを参照。
 *
 * 層に触れたらこちらでカレンダーを閉じるので、開閉の状態(state)に手が届く必要がある。
 * HeroUI の <DatePicker> は状態を外へ出さない(onOpenChange は内部の処理で上書きされて
 * 呼び出し側へ届かず、isOpen を渡すと開けなくなる)。そこで、HeroUI が公開しているフック
 * useDatePicker と部品で、<DatePicker> と同じものをここで組み立てる(DatePickerWithShield)。
 *
 * 2026-11-27 にスマホ相当の画面(タッチ、60〜600ms のタップ)で確認したこと:
 *   - タブ・下部ナビのリンク・ヘッダーのボタン・react-select の欄(イベント・デッキ選択)の
 *     どれにも届かない。もう1回押せば反応する
 *   - 外側から指でスクロールすると、これまでどおり閉じてページが動く
 *   - 日付ボタンをもう1回押すと閉じる。閉じた直後に押し直しても開く
 *   - モーダル(イベント情報の変更)の中でも同じ。カレンダーの外を押してもモーダルは閉じない
 *   - パソコンのマウスとキーボード(Esc・Enter・矢印・Alt+↓)の動きは変わらない。開いている間、
 *     日付欄にマウスを乗せても色が変わらなくなる(層が上にあるため)
 *   - 描く内容(DOM)は HeroUI の <DatePicker> と一致する
 *
 * 呼び出し側が popoverProps を渡したときは、その値を後から重ねる。isNonModal: true を渡すと
 * 非モーダルに戻り、層も置かない(外側のタップが下に届く)。
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

  return <DatePickerWithShield {...props} />;
}

/*
 * HeroUI の <DatePicker>(@heroui/date-picker の date-picker.tsx)と同じ組み立てに、
 * 外側のタップを受け止める層を足したもの。
 *
 * 描く内容は HeroUI の本体と揃えてある(日付欄・カレンダーを開くボタン・吹き出しの中のカレンダー・
 * 時刻欄)。HeroUI を上げたときは、本体の組み立てが変わっていないかを見比べること。
 */
function DatePickerWithShield<T extends DateValue>(props: DatePickerProps<T>) {
  const { selectorButtonPlacement = "end", ...otherProps } = props;
  const popoverProps = { ...POPOVER_PROPS, ...props.popoverProps };

  const {
    state,
    startContent,
    endContent,
    selectorIcon,
    showTimeField,
    disableAnimation,
    isCalendarHeaderExpanded,
    getDateInputProps,
    getPopoverProps,
    getTimeInputProps,
    getSelectorButtonProps,
    getSelectorIconProps,
    getCalendarProps,
    CalendarTopContent,
    CalendarBottomContent,
  } = useDatePicker<T>({ ...otherProps, popoverProps });

  const selectorContent = isValidElement(selectorIcon) ? (
    cloneElement(selectorIcon, getSelectorIconProps())
  ) : (
    <CalendarBoldIcon {...getSelectorIconProps()} />
  );

  // 年月の選択を広げている間は、上下の差し込みを出さない(HeroUI の本体と同じ)
  const calendarBottomContent = isCalendarHeaderExpanded ? null : showTimeField ? (
    <>
      <TimeInput {...getTimeInputProps()} />
      {CalendarBottomContent}
    </>
  ) : (
    CalendarBottomContent
  );
  const calendarTopContent = isCalendarHeaderExpanded ? null : CalendarTopContent;

  const popoverContent = state.isOpen ? (
    <FreeSoloPopover {...getPopoverProps()}>
      <Calendar
        {...getCalendarProps()}
        bottomContent={calendarBottomContent}
        topContent={calendarTopContent}
      />
    </FreeSoloPopover>
  ) : null;

  return (
    <>
      <DateInput
        {...getDateInputProps()}
        endContent={
          selectorButtonPlacement === "end" ? (
            <Button {...getSelectorButtonProps()}>{endContent || selectorContent}</Button>
          ) : (
            endContent
          )
        }
        startContent={
          selectorButtonPlacement === "start" ? (
            <Button {...getSelectorButtonProps()}>{startContent || selectorContent}</Button>
          ) : (
            startContent
          )
        }
      />
      {disableAnimation ? popoverContent : <AnimatePresence>{popoverContent}</AnimatePresence>}
      {!popoverProps.isNonModal && (
        <OutsideTapShield isOpen={state.isOpen} onDismiss={state.close} />
      )}
    </>
  );
}
