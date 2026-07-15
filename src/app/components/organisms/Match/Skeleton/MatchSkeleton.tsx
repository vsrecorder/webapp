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
          // 実態の対戦行は HeroUI Button(高さ固定)に py-6 を付けており、行の高さは
          // padding 基準の約48px(=h-12)で決まる(中身はその箱にほぼ収まる)。
          // 素の div に py-6 を付けると中身の高さが加算されて実態の倍近くになるため、
          // ここは固定高さで実態の行高さに合わせる。
          // 編集可能(詳細ページ)では左に並び替えガター(上下ボタン)が入り実態の行が
          // 高くなる(約62px)ため、その場合は h-16 に広げる。
          className={`flex w-full items-center gap-1.5 pl-1.5 pr-0.5 ${
            enableUpdateMatchModalButton ? "h-16" : "h-12"
          } ${i > 0 ? "border-t border-divider" : ""}`}
        >
          {/* 並び替えボタンのガター(編集可能なときのみ) */}
          {enableUpdateMatchModalButton && (
            <div className="flex w-8 shrink-0 flex-col items-start gap-1.5 pl-1.5">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
          )}
          {/* W/Lバッジ(BO1と同じ h-9 w-9) */}
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          {/* 相手のスプライト2枚(実態は gap-0 で隣接)＋デッキ名/チップを1つのフレックスに収める */}
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <div className="ml-1.5 flex shrink-0 items-center gap-0">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <Skeleton className="h-11 w-11 rounded-lg" />
            </div>
            {/* 相手デッキ名＋チップ(先攻/後攻・サイド差など)の2行 */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-10 rounded-sm" />
                <Skeleton className="h-4 w-12 rounded-sm" />
              </div>
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
      {/* 対戦行。実態は Table の wrapper(px-1 py-1) で内側に余白があるため合わせる */}
      <div className="px-1 py-1">
        <Rows enableUpdateMatchModalButton={enableUpdateMatchModalButton} />
      </div>
      {/* 「対戦結果を追加する」ボタン。実態は横幅いっぱい・h-10・pill 型で
          px-1 pb-3 の余白を持つ(CreateMatchModalButton + Matches のラッパー) */}
      {enableCreateMatchModalButton && (
        <div className="px-1 pb-3">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      )}
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
