"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { LuCircleHelp } from "react-icons/lu";

type Props = {
  // 何の説明かをスクリーンリーダーへ伝えるための見出し(パネルのラベル)
  label: string;
  text: string;
};

/*
 * ボードのパネル見出しに置く「?」と、その説明の吹き出し。
 *
 * 設定パネルは説明文を常時1〜3行出していたが、4つ並ぶと説明だけで画面を占め、
 * 2回目以降は読まれない。説明はここへ畳み、空いた場所には現在値を出す。
 *
 * 吹き出しの作りはヘッダーの対戦環境(CurrentEnvironment)・きずな(KizunaHintPopover)と揃える。
 * backdrop を敷くのは、吹き出しの外を触って閉じる操作が背後のパネル(セグメント
 * コントロール等)のタップとして拾われないようにするため。
 *
 * この吹き出しは記録詳細ページでのみ使う。HeroUI Modal の中で開くと、body 直下へ
 * portal される吹き出し内のタップが react-aria に「モーダルの外側」とみなされうる
 * (詳細は KizunaHintPopover のコメント)。モーダル側は説明を編集シートに出しており、
 * この吹き出しは使わない。
 */
export default function BoardPanelHelp({ label, text }: Props) {
  return (
    <Popover
      placement="bottom-end"
      offset={6}
      showArrow
      backdrop="opaque"
      shouldBlockScroll
      isNonModal={false}
      disableAnimation
    >
      <PopoverTrigger>
        {/*
          見出しの行の高さを変えずに当たり判定だけ広げる。
          アイコンだけだと 14px 角にしかならず、指のタップが少しずれると外れる。
        */}
        <button
          type="button"
          aria-label={`${label}の説明を表示`}
          className="-my-2 -mr-1 flex shrink-0 items-center justify-center px-1 py-2 text-default-400 active:opacity-70"
        >
          <LuCircleHelp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="px-3 py-2.5">
        <div className="flex max-w-64 flex-col gap-1 text-left">
          <span className="text-tiny font-bold text-default-600">{label}</span>
          <p className="text-tiny leading-relaxed text-default-500">{text}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
