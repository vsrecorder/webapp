"use client";

import { Button } from "@heroui/react";
import { LuShare2 } from "react-icons/lu";

type Props = {
  isDisabled?: boolean;
  onPress: () => void;
};

/*
 * ダッシュボードの分析パネルの見出し行、右端に置く「シェア」ボタン。
 *
 * 塗りはブランドのグラデーション(青 → 藍 → 紫)。color="primary" の solid は .bg-primary で
 * 塗られ、globals.css がそこへ --brand-gradient を重ねるので、ここでは色を指定しない。
 * 各パネルで寸法と色を揃えるため、見出し行のボタンはこの部品を使う。
 */
export default function PanelShareButton({ isDisabled, onPress }: Props) {
  return (
    <Button
      size="sm"
      color="primary"
      radius="full"
      className="h-7 shrink-0 px-3 text-xs font-bold"
      startContent={<LuShare2 className="h-3.5 w-3.5" />}
      isDisabled={isDisabled}
      onPress={onPress}
    >
      シェア
    </Button>
  );
}
