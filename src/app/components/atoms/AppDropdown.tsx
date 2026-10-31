"use client";

import { Dropdown as HeroUIDropdown, type DropdownProps } from "@heroui/dropdown";

import {
  OVERLAY_BACKDROP_MARK,
  releaseClosingBackdrop,
  resolveOverlayBackdrop,
} from "@app/utils/closingBackdrop";

/*
 * 外側のタップを「閉じるだけ」にした Dropdown。
 * アプリ内のメニューはすべて @heroui/dropdown の Dropdown ではなくこれを使う
 * (DropdownTrigger / DropdownMenu / DropdownItem / DropdownSection はそのまま @heroui/dropdown から)。
 *
 * HeroUI 既定のままだと 2 つの問題があった。
 *
 *   1. 暗幕の無いメニューは、外側のタップが閉じると同時に下の要素にも届く(すり抜け)。
 *      閉じるつもりのタップで隣のボタンが押され、ページが変わる。
 *      → 指定が無ければ透明な層を出してタップを吸う(resolveOverlayBackdrop)。
 *   2. 暗幕(層)のあるメニューは、閉じたあとフェードアウトの約 0.3 秒のあいだ層がトリガーを覆い、
 *      その間にもう一度タップしても開き直せない(死に窓)。
 *      → 閉じ始めたら層を触れなくする(releaseClosingBackdrop)。
 *
 * 暗幕を見せたいメニュー(ユーザーメニュー・通知)は backdrop="opaque" を明示する。
 */
export function Dropdown({ backdrop, classNames, onOpenChange, ...props }: DropdownProps) {
  const resolved = resolveOverlayBackdrop(backdrop, classNames?.backdrop as string | undefined);

  return (
    <HeroUIDropdown
      {...props}
      backdrop={resolved.backdrop}
      classNames={{ ...classNames, backdrop: resolved.backdropClassName }}
      onOpenChange={(open) => {
        if (!open) releaseClosingBackdrop(OVERLAY_BACKDROP_MARK);
        onOpenChange?.(open);
      }}
    />
  );
}
