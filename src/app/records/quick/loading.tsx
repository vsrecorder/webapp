import { Card, CardBody, Skeleton } from "@heroui/react";

// /records/quick の Suspense 境界。実ページ(TemplateQuickRecordCreate)と同じ
// カード枠と入力レイアウト（相手デッキ→先攻/後攻→結果→詳細→保存ボタン）に骨格を揃え、
// サーバレンダリング待ちの間に画面が固まって見えるのを防ぐ。
export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto w-full px-3 py-6" aria-hidden="true">
      <Card className="shadow-md">
        <CardBody className="p-5 flex flex-col gap-5">
          {/* タイトル */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>

          {/* 相手のデッキ(スプライト2枠＋入力＋履歴候補) */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex gap-0 shrink-0">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
            <div className="flex gap-2 py-1 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-24 rounded-xl shrink-0" />
              ))}
            </div>
          </div>

          {/* 先攻 / 後攻 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          </div>

          {/* 結果 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-12 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          </div>

          {/* 詳細アコーディオン */}
          <Skeleton className="h-14 w-full rounded-xl" />

          {/* 保存ボタン */}
          <Skeleton className="h-12 w-full rounded-full" />
        </CardBody>
      </Card>
    </div>
  );
}
