import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

/*
 * 使用デッキ行(スプライト2体 + デッキ名)のスケルトン。
 * RecordCardBase のデッキ読み込み中表示と共有する。実データ描画時にレイアウトシフトが
 * 起きないよう、スプライトは実物と同じ w-7 h-7 を隙間なく2体並べた寸法にしている
 * (塊に見えないよう rounded-full で個々の輪郭を出す)。
 */
export function RecordDeckRowSkeleton() {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex items-center shrink-0">
        <Skeleton className="w-7 h-7 rounded-full" />
        <Skeleton className="w-7 h-7 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-24 rounded-md" />
    </div>
  );
}

/*
 * RecordCardBase と同じ骨格のローディングスケルトン。
 * 公式/Tonamel/自由形式の全カードで共有する。
 */
export function RecordCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Card shadow="none" className="border border-divider overflow-hidden">
        <CardBody className="p-0">
          <div className="flex">
            {/* 左アクセントバー */}
            <Skeleton className="w-1 shrink-0 rounded-none" />

            <div className="flex-1 px-4 py-3.5 min-w-0">
              {/* 開催日 */}
              <Skeleton className="h-3.5 w-28 rounded-md" />

              {/* イベント名 */}
              <Skeleton className="h-5 w-48 rounded-md mt-0.5" />

              {/* チップ（種別＋対戦環境の2個が最も一般的な構成） */}
              <div className="flex items-center gap-2 mt-1.5">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>

              {/* 区切り線 */}
              <div className="border-t border-divider mt-3 mb-2.5" />

              {/* 情報行(アイコン枠 + デッキ + 勝敗) */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  <RecordDeckRowSkeleton />
                  {/* チーム戦バッジ・勝敗バッジ(ともに text-xs px-1.5 py-0.5)と高さ・幅を揃える */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Skeleton className="h-5 w-10 rounded-md" />
                    <Skeleton className="h-5 w-12 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// display: 常に表示する場合は "flex"、特定ブレークポイント以降だけ表示する場合は
// "hidden md:flex" のように渡す（"hidden" と "flex" を同時にベースクラスへ
// 混在させると詳細度の関係で意図通りに切り替わらないため、呼び出し側で出し分ける）。
function MonthHeaderSkeleton({
  display = "flex",
  colSpanClass,
}: {
  display?: string;
  colSpanClass: string;
}) {
  return (
    <div
      className={`col-span-1 ${colSpanClass} ${display} items-center gap-3 pt-1 pb-0.5`}
    >
      <Skeleton className="h-3.5 w-14 rounded-md shrink-0" />
      <div className="flex-1 h-px bg-divider" />
    </div>
  );
}

// スマホ: 3枚 / タブレット(md〜): 4枚 / デスクトップ(lg〜): 2列なら8枚・3列なら9枚
// （デスクトップの列数は Records の desktopColumns に合わせて呼び出し元から渡す）
export function RecordCardSkeletons({ desktopColumns = 2 }: { desktopColumns?: 2 | 3 }) {
  const colSpanClass =
    desktopColumns === 3 ? "lg:col-span-2 xl:col-span-3" : "lg:col-span-2";
  const extraDesktopCards = desktopColumns === 3 ? 5 : 4;

  return (
    <>
      <MonthHeaderSkeleton colSpanClass={colSpanClass} />
      <RecordCardSkeleton />
      <RecordCardSkeleton />
      <RecordCardSkeleton />
      <RecordCardSkeleton className="hidden md:block" />

      <MonthHeaderSkeleton display="hidden lg:flex" colSpanClass={colSpanClass} />
      {Array.from({ length: extraDesktopCards }).map((_, i) => (
        <RecordCardSkeleton key={i} className="hidden lg:block" />
      ))}
    </>
  );
}
