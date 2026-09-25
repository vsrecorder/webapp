import { Card, CardBody } from "@heroui/react";

import CityleagueEventSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventSkeleton";

type Props = {
  /*
   * 開催期間外の先出しプレビュー(次シーズン初日の案内バナー)を含む形かどうか。
   * バナー1行ぶん実体の高さが増えるため、その分 min-h を足す(CityleagueEvents 参照)。
   */
  withPreviewBanner?: boolean;
};

// ホーム(ダッシュボード)の「本日のシティリーグ結果」に置く骨格。
// 実体は Card の中にタブ(オープン/シニア/ジュニア)と、その下に Swiper で並ぶイベントカード。
// カードは横スワイプで並ぶが、縦の高さは1枚ぶんなので骨格も1枚だけ置く。
export default function CityleagueEventsSkeleton({ withPreviewBanner = false }: Props) {
  return (
    // 高さは中身の組み立て(タブ + 会場カード1枚)を実体と同じにすることで揃える。
    // 会場カードはデータによらず一定の高さ(CityleagueEventCard 参照)なので、min-h で
    // 決め打ちしない。390px 幅の実測で 204px、プレビューのバナーありで 232px(2026-09-26)。
    // 以前は「大会終了」でチップ列が2行になった会場カードに合わせた 232px を min-h で当てていた
    <Card className="w-full">
      <CardBody className="px-0 py-1 w-full">
        {withPreviewBanner && (
          // CityleagueEvents のプレビューバナー(px-3 pb-1 + text-xs font-bold 1行)と同じ場所を取る
          <div className="px-3 pb-1">
            <span className="relative inline-flex items-center">
              <span aria-hidden className="invisible text-xs font-bold">
                2026年9月26日(土) 開催予定
              </span>
              <span className="absolute inset-y-0.5 left-0 right-0 rounded-md bg-default-100 animate-pulse" />
            </span>
          </div>
        )}

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
