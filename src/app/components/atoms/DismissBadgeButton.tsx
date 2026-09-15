"use client";

import { LuX } from "react-icons/lu";

/*
 * 画面下に出る帯(記録中バー・PWA の各バナー)を閉じるボタン。
 *
 * 帯の右上へ、通知バッジのように角から少しはみ出させて重ねる。行の中に置くと
 * 本文の幅を削るうえ、その帯の主操作と同じ重さに見えてしまう。角から外へ出すことで
 * 「この帯自体を片付ける」操作だと分かる。
 *
 * 置く側の要素は position を持つこと(fixed / relative)。角を切っている場合
 * (overflow-hidden)はボタンが欠けるので、角丸は内側のラッパーへ移すこと。
 */

type Props = {
  // 何を閉じるのかが分かる文言(「バナーを閉じる」など)
  label: string;
  onPress: () => void;
};

export default function DismissBadgeButton({ label, onPress }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="absolute -right-2 -top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-divider bg-content1 text-default-500 shadow-md transition-transform active:scale-95"
    >
      <LuX className="h-3.5 w-3.5" />
    </button>
  );
}
