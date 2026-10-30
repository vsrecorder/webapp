"use client";

import { useRef, useState } from "react";

import { useReturnPosition } from "@app/hooks/useReturnPosition";
import {
  CITYLEAGUE_LATEST_RETURN_KEY,
  CITYLEAGUE_SCROLL_TO_ID_KEY,
} from "@app/utils/cityleagueScrollRestore";
import {
  currentReturnTargetSequence,
  isReturnTargetMarkedAfter,
} from "@app/utils/returnTarget";

/*
 * 大会結果一覧の末尾のリンク集(CityleagueLatestSection)を包み、戻ってきたときに元の位置で見せる。
 *
 * 一覧のページはタブの一覧が自分で戻り位置を持つので、ページ全体ではなくこのリンク集だけを
 * 受け持つ(リンク集が画面に入っていないときは控えない)。離れるときに一覧が戻り先のカードを
 * 控えたら(画面に一覧のカードも見えていた・カードから進んだ)、こちらは控えない。両方で
 * 動かすと、後から動いた方が勝って位置がずれる(一覧は戻ると1ページ目に戻るので、リンク集の
 * 位置で合わせると画面に見えていた一覧のカードが揃わない)。
 */
export default function CityleagueLatestReturnArea({
  children,
}: {
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // 現れた時点の書き込みの番号。一覧がこの離れ方で控えたかを見分ける
  const [sequenceAtMount] = useState(currentReturnTargetSequence);

  useReturnPosition(rootRef, {
    storageKey: CITYLEAGUE_LATEST_RETURN_KEY,
    skipRecord: () =>
      isReturnTargetMarkedAfter(CITYLEAGUE_SCROLL_TO_ID_KEY, sequenceAtMount),
  });

  return <div ref={rootRef}>{children}</div>;
}
