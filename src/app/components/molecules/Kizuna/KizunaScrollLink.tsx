"use client";

import type { MouseEvent, ReactNode } from "react";

import { smoothScrollTo } from "@app/utils/scroll";

type Props = {
  // スクロール先の要素のid（"#" は含めない）
  targetId: string;
  className?: string;
  children: ReactNode;
};

/*
 * ページ内リンクをなめらかにスクロールさせる。
 * 移動先のセクションには scroll-mt-* を付けておくこと（固定ヘッダーの下に潜らないよう、
 * scrollIntoView が scroll-margin-top を尊重する）。
 */
export default function KizunaScrollLink({ targetId, className, children }: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) return; // 見つからなければ通常のアンカー遷移に任せる

    e.preventDefault();

    smoothScrollTo(target);

    // アドレスバーのハッシュは残す（リンクとして共有できる状態を保つ）
    history.replaceState(null, "", `#${targetId}`);
  };

  return (
    <a href={`#${targetId}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
