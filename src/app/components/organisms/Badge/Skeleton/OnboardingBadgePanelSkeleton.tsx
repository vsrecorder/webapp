import { Card, CardBody } from "@heroui/react";

import { BadgeTileSkeleton } from "@app/components/organisms/Badge/badgeUi";

// 「はじめの一歩」パネルの骨格。パネル自身の読み込み中表示と、
// ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
export default function OnboardingBadgePanelSkeleton() {
  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-2">
        {/* 獲得数(text-xs = 16px の行) */}
        <div className="h-4 flex items-center">
          <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BadgeTileSkeleton key={i} nameSample="初デッキ" />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
