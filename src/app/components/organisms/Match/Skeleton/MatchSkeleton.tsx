"use client";

import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

type Props = {
  enableCreateMatchModalButton: boolean;
  // ボードのパネル内に置く場合は true。外側のカード枠を外す。
  flat?: boolean;
};

// 対戦行(W/Lバッジ＋スプライト2枚＋相手デッキ名＋チップ)の骨格
function Rows() {
  return (
    <div className="flex w-full flex-col">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 px-1 py-2.5 ${
            i > 0 ? "border-t border-divider" : ""
          }`}
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex shrink-0 items-center gap-0.5">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="h-4 w-12 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function MatchSkeleton({
  enableCreateMatchModalButton,
  flat = false,
}: Props) {
  const content = (
    <div className="flex w-full flex-col gap-1.5">
      <Rows />
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
