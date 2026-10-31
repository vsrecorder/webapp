"use client";

import { Popover as HeroUIPopover, type PopoverProps } from "@heroui/popover";

import {
  OVERLAY_BACKDROP_MARK,
  releaseClosingBackdrop,
  resolveOverlayBackdrop,
} from "@app/utils/closingBackdrop";

/*
 * 外側のタップを「閉じるだけ」にした Popover。
 * アプリ内の吹き出しはすべて @heroui/popover の Popover ではなくこれを使う
 * (PopoverTrigger / PopoverContent はそのまま @heroui/popover から)。
 *
 * 考え方は AppDropdown と同じ(そちらのコメントを参照)。Popover 固有の違いは isNonModal の既定。
 * HeroUI の既定は true(非モーダル。層を出さず、外側のタップが下に届く)なので、ここでは
 * false を既定にして層を出す。記録カードの「集計対象外」の吹き出しのように、タップで開く
 * 親(カード)の上に乗る吹き出しで、外側のタップがカードに届くのを防ぐ。
 * 背面を操作しながら見せたい吹き出しがあれば isNonModal を明示する。
 */
export function Popover({
  backdrop,
  classNames,
  onOpenChange,
  isNonModal = false,
  ...props
}: PopoverProps) {
  const resolved = resolveOverlayBackdrop(backdrop, classNames?.backdrop as string | undefined);

  return (
    <HeroUIPopover
      {...props}
      isNonModal={isNonModal}
      backdrop={resolved.backdrop}
      classNames={{ ...classNames, backdrop: resolved.backdropClassName }}
      onOpenChange={(open) => {
        if (!open) releaseClosingBackdrop(OVERLAY_BACKDROP_MARK);
        onOpenChange?.(open);
      }}
    />
  );
}
