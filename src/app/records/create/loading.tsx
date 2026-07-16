import { Card, CardBody, Skeleton } from "@heroui/react";

import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";

// /records/create の Suspense 境界。実ページ(TemplateRecordCreate)と同じ
// 「上部固定タブ＋入力フォーム」の枠を即座に見せ、サーバレンダリング待ちの間に
// 画面が固まって見えるのを防ぐ。フォームの各行はタブの実レイアウト
// （開催日→イベント→プレビュー→デッキ→バージョン→作成ボタン）に骨格を揃える。
export default function Loading() {
  return (
    <>
      {/* タブ(公式イベント/Tonamel/自由形式) */}
      <FixedTabBarSkeleton count={3} positionClassName="top-15 left-0 right-0" />

      <div className="pt-9 flex flex-col gap-1.5" aria-hidden="true">
        {/* 開催日 */}
        <div className="flex flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* イベント */}
        <div className="flex flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* イベントプレビューカード */}
        <div className="pt-1">
          <Card radius="none" shadow="sm">
            <CardBody>
              <div className="flex items-center gap-5 w-full min-w-0">
                <Skeleton className="h-18 w-18 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <Skeleton className="h-3 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* デッキ */}
        <div className="flex flex-col gap-2 pt-1.5">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* バージョン */}
        <div className="pb-1.5 flex flex-col gap-2">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* デッキ画像 */}
        <Skeleton className="aspect-2/1 w-full rounded-lg" />

        {/* 作成ボタン */}
        <Skeleton className="h-11 w-full rounded-lg mt-1" />
      </div>
    </>
  );
}
