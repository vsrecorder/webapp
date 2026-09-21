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

  return <DatePicker {...props} />;
}
