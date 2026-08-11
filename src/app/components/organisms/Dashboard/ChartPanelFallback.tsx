import { Card, CardBody, Skeleton } from "@heroui/react";

type Props = {
  // パネル自身が見出し行（タイトル＋シェアボタン）を持つ場合に true。
  // DeckUsagePanel / OpponentDeckUsagePanel は見出しをパネル内で描くため、
  // ここに置かないと実体へ差し替わった瞬間に見出し行のぶんだけ下がずれる。
  withHeading?: boolean;
};

// chart.js を抱えるパネルを読み込む間のプレースホルダ。
// 高さ0にならないよう、実体のパネル（フィルタ＋セレクタ＋グラフ）に
// 近い骨格を置いて、描画時のレイアウトシフトを抑える。
export default function ChartPanelFallback({ withHeading = false }: Props) {
  return (
    <>
      {withHeading && (
        // 実体は h2（text-sm）と h-7 のシェアボタンが並ぶ行。行の高さはボタン側で決まる。
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      )}
      <Card>
        <CardBody className="gap-4 p-4">
          {/* フィルタータブ */}
          <Skeleton className="h-8 w-full rounded-xl" />
          {/* セレクタ */}
          <Skeleton className="h-10 w-full rounded-xl" />
          {/* グラフ本体 */}
          <Skeleton className="aspect-square w-full rounded-xl" />
        </CardBody>
      </Card>
    </>
  );
}
