"use client";

import { LuX } from "react-icons/lu";

/*
 * 画面下に出る帯(記録中バー・PWA の各バナー)を閉じるボタン。
 *
 * 帯の右上へ、通知バッジのように角から少しはみ出させて重ねる。行の中に置くと
 * 本文の幅を削るうえ、その帯の主操作と同じ重さに見えてしまう。角から外へ出すことで
 * 「この帯自体を片付ける」操作だと分かる。
 *
 * 右へのはみ出しは 4px に留める。帯は画面端から 8px 浮いている
 * (BottomBanner の left-2/right-2)ので、8px 出すとそのぶんをちょうど食い潰して
 * ボタンだけが画面の端に貼り付く。半分だけ出して、角に載りつつ端の余白も残す。
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
      /*
        見た目は 28px だが、指で押す領域は 44px 確保する(iOS の推奨)。
        丸を大きくすると角のバッジとして重く見えるので、疑似要素で領域だけ広げる。
      */
      className="absolute -right-1 -top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-divider bg-content1 text-default-500 shadow-md transition-transform after:absolute after:-inset-2 after:content-[''] active:scale-95"
    >
      <LuX className="h-3.5 w-3.5" />
    </button>
  );
}
