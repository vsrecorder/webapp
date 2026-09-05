"use client";

import { useState } from "react";

import { LuCheck, LuCopy } from "react-icons/lu";

import { copyDeckCode } from "@app/utils/deckCodeClipboard";

// 枠の地色。デッキコード欄を置く場所の背景に合わせて選ぶ。
//   default : 通常の面（カード・モーダル本体）の上
//   content1: 背景が bg-default-100 の面の上（バージョン履歴のカードなど）
//   none    : 枠を出さず、その場の行に馴染ませる（デッキ詳細ページの一覧行）
const BACKGROUND_CLASS = {
  default: "justify-center rounded-lg bg-default-100 px-3 py-2",
  content1: "justify-center rounded-lg bg-content1 px-3 py-2",
  none: "",
} as const;

type Props = {
  // 表示・コピーするデッキコード。未登録（null/空）のときは「なし」表示にする。
  code?: string | null;
  // 先頭に添えるラベル。場所によっては「コード」と短くする。
  label?: string;
  background?: keyof typeof BACKGROUND_CLASS;
  className?: string;
};

/*
 * デッキコードの表示欄。タップでクリップボードへコピーする。
 *
 * デッキコードは公式サイトへ貼り付けて使うものなので、この欄の用途はコピーに限られる。
 * 小さなコピーアイコンだけを的にせず、枠のどこを押してもコピーできるようにしてある。
 * 親カードのタップ（デッキ詳細モーダルを開く等）とは役割が違うため伝播は止める。
 */
export default function CopyableDeckCode({
  code,
  label = "デッキコード",
  background = "default",
  className = "",
}: Props) {
  // コピー直後だけアイコンをチェックに変える（押せたことをその場で返す）
  const [copied, setCopied] = useState(false);

  async function handleCopy(value: string) {
    if (!(await copyDeckCode(value))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const baseClass =
    `flex w-full min-w-0 items-center gap-2 ${BACKGROUND_CLASS[background]} ${className}`.trim();

  const labelNode = <span className="shrink-0 text-tiny text-default-500">{label}</span>;

  // 未登録のデッキコードはコピーできないため、押せない見た目にする
  if (!code) {
    return (
      <div className={baseClass}>
        {labelNode}
        <span className="min-w-0 truncate text-small text-default-400">なし</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="デッキコードをコピー"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy(code);
      }}
      className={`${baseClass} text-default-400 active:opacity-70`}
    >
      {labelNode}
      <span className="min-w-0 truncate font-mono text-small text-default-foreground">
        {code}
      </span>
      {/* コピーアイコンは操作用UIなので、シェア画像には含めない
          (data-capture-hide は captureThemedPng が複製後に除去する目印) */}
      <span data-capture-hide="true" className="shrink-0">
        {copied ? (
          <LuCheck className="h-4 w-4 text-success" />
        ) : (
          <LuCopy className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}
