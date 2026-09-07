import { Card, CardBody } from "@heroui/react";

import SkeletonTextLine from "@app/components/molecules/Skeleton/SkeletonTextLine";

// 「最初の記録」CTA(施策0-6)の骨格。
// 実体は取得を伴わない静的なカードだが、骨格として描くと表示回数の GA イベントが
// 二重に飛んでしまうため、同じ寸法の骨格をここに別途持つ。
export default function FirstRecordCtaCardSkeleton() {
  return (
    <Card className="shadow-md border-2 border-primary bg-primary/5">
      <CardBody className="p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          {/* 「クイックスタート」(text-xs の行 = 16px) */}
          <div className="h-4 flex items-center">
            <div className="h-2.5 w-28 rounded-full bg-primary/20 animate-pulse" />
          </div>
          {/* 見出し(text-lg の行 = 28px) */}
          <div className="h-7 flex items-center">
            <div className="h-5 w-56 max-w-full rounded-md bg-primary/20 animate-pulse" />
          </div>
          {/* 説明2行(text-sm。実体は <br> で必ず2行になる) */}
          <div className="flex flex-col">
            <SkeletonTextLine textClassName="text-sm">
              <span className="h-3 w-64 max-w-full rounded-full bg-default-200 animate-pulse" />
            </SkeletonTextLine>
            <SkeletonTextLine textClassName="text-sm">
              <span className="h-3 w-48 max-w-full rounded-full bg-default-200 animate-pulse" />
            </SkeletonTextLine>
          </div>
        </div>
        {/* ボタン2つ(Button size="lg" = 48px / 既定 = 40px)。狭い画面では縦に積む */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="h-12 w-full sm:w-56 rounded-full bg-primary/20 animate-pulse" />
          <div className="h-10 w-full sm:w-48 rounded-full bg-default-100 animate-pulse" />
        </div>
      </CardBody>
    </Card>
  );
}
