import { Card, CardBody, Skeleton } from "@heroui/react";

// chart.js を抱えるパネルを動的 import する間のプレースホルダ。
// チャンク読み込み中に高さ0にならないよう、実体のパネル（フィルタ＋セレクタ＋グラフ）に
// 近い骨格を置いて、描画時のレイアウトシフトを抑える。
export default function ChartPanelFallback() {
  return (
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
  );
}
