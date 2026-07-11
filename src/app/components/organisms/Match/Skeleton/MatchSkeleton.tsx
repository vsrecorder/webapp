"use client";

import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

type Props = {
  enableCreateMatchModalButton: boolean;
  // 並び替えボタン(左のガター)を表示するか。実態(編集可能な詳細ページ)に合わせる。
  enableUpdateMatchModalButton?: boolean;
  // ボードのパネル内に置く場合は true。外側のカード枠を外す。
  flat?: boolean;
};

// 対戦行の骨格。実態(Matches)の1行に合わせて
// 「並び替えガター(編集時)＋W/Lバッジ＋相手スプライト2枚＋相手デッキ名/チップ2行」を並べる。
function Rows({
  enableUpdateMatchModalButton,
}: {
  enableUpdateMatchModalButton: boolean;
}) {
  return (
    <div className="flex w-full flex-col">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex w-full items-center gap-1 px-1 py-4 ${
            i > 0 ? "border-t border-divider" : ""
          }`}
        >
          {/* 並び替えボタンのガター(編集可能なときのみ) */}
          {enableUpdateMatchModalButton && (
            <div className="flex w-8 shrink-0 flex-col items-start gap-1.5 pl-1.5">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
          )}
          {/* W/Lバッジ */}
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          {/* 相手のスプライト2枚(要素同士は少し間隔を空ける) */}
          <div className="ml-1.5 flex shrink-0 items-center gap-1.5">
            <Skeleton className="h-11 w-11 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-lg" />
          </div>
          {/* 相手デッキ名＋チップ(先攻/後攻・サイド差など)の2行 */}
          <div className="ml-1.5 flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="flex gap-1">
              <Skeleton className="h-4 w-10 rounded-sm" />
              <Skeleton className="h-4 w-12 rounded-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MatchSkeleton({
  enableCreateMatchModalButton,
  enableUpdateMatchModalButton = false,
  flat = false,
}: Props) {
  const content = (
    <div className="flex w-full flex-col gap-1.5">
      <Rows enableUpdateMatchModalButton={enableUpdateMatchModalButton} />
      {enableCreateMatchModalButton && <Skeleton className="h-8 w-full rounded-2xl" />}
    </div>
  );

  if (flat) return content;

  return (
    <div>
      <Card>
        <CardBody className="w-full px-1 py-1">{content}</CardBody>
      </Card>
    </div>
  );
}
