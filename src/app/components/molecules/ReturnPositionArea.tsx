"use client";

import { useRef } from "react";

import { useReturnPosition } from "@app/hooks/useReturnPosition";

/*
 * 中身を包み、このページを離れて戻ってきたときに元の位置で見せる(useReturnPosition)。
 * サーバコンポーネントのページ(大会結果の索引・会場一覧など)から使えるよう、部品にしてある。
 */
export default function ReturnPositionArea({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReturnPosition(rootRef);

  return <div ref={rootRef}>{children}</div>;
}
