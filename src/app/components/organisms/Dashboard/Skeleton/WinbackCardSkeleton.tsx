import { Card, CardBody } from "@heroui/react";

import SkeletonTextLine from "@app/components/molecules/Skeleton/SkeletonTextLine";

// 「おかえり」カード(施策D-4)の骨格。
// 実体は取得を伴わない静的なカードだが、骨格として描くと表示回数の計測が二重に飛ぶため、
// 同じ寸法の骨格をここに別途持つ(FirstRecordCtaCardSkeleton と同じ事情)。
// 末尾のレポートへのリンクは出ない人もいるので、背の低い側(無し)に倒す。
export default function WinbackCardSkeleton() {
  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardBody className="p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          {/* 「おかえりなさい」(text-xs の行)と右端の × (Button size="sm" = 32px) */}
          <div className="h-8 flex items-center justify-between">
            <div className="h-2.5 w-24 rounded-full bg-primary/20 animate-pulse" />
            <div className="h-6 w-6 rounded-full bg-default-100 animate-pulse" />
          </div>
          {/* 見出し(text-lg の行 = 28px)。「最後の対戦は〜の週」と「（◯週間ぶり）」の2行 */}
          <div>
            <div className="h-7 flex items-center">
              <div className="h-5 w-64 max-w-full rounded-md bg-primary/20 animate-pulse" />
            </div>
            <div className="h-7 flex items-center">
              <div className="h-5 w-28 max-w-full rounded-md bg-primary/20 animate-pulse" />
            </div>
          </div>
          {/* 環境の1行(text-sm) */}
          <SkeletonTextLine textClassName="text-sm">
            <span className="h-3 w-56 max-w-full rounded-full bg-default-200 animate-pulse" />
          </SkeletonTextLine>
        </div>
        <div className="flex flex-col gap-2">
          {/* ボタン(Button size="lg" = 48px)。狭い画面では幅いっぱい */}
          <div className="h-12 w-full sm:w-56 rounded-full bg-primary/20 animate-pulse" />
          {/* 補足の1行(text-xs) */}
          <SkeletonTextLine textClassName="text-xs">
            <span className="h-2.5 w-64 max-w-full rounded-full bg-default-200 animate-pulse" />
          </SkeletonTextLine>
        </div>
      </CardBody>
    </Card>
  );
}
