import { Card, CardBody } from "@heroui/react";

import CityleagueEventSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventSkeleton";

// ホーム(ダッシュボード)の「本日のシティリーグ」に置く骨格。
// 実体は Card の中にタブ(オープン/シニア/ジュニア)と、その下に Swiper で並ぶイベントカード。
// カードは横スワイプで並ぶが、縦の高さは1枚ぶんなので骨格も1枚だけ置く。
export default function CityleagueEventsSkeleton() {
  return (
    <Card className="w-full">
      <CardBody className="px-0 py-1 w-full">
        {/* タブ(Tabs size="sm" の tab は h-7。tabList の余白ぶんを含めて場所を取る) */}
        <div className="w-full pl-1 pr-1">
          <div className="h-9 w-full rounded-medium bg-default-100 animate-pulse" />
        </div>

        {/* SwiperSlide の p-3 と同じ余白でイベントカード1枚ぶん */}
        <div className="p-3">
          <CityleagueEventSkeleton />
        </div>
      </CardBody>
    </Card>
  );
}
