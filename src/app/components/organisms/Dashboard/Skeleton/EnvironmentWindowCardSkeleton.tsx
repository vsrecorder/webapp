import { Card, CardBody } from "@heroui/react";

// 環境ウィンドウ(組み合わせパネル)の骨格。カード自身の読み込み中表示と、
// ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
//
// 本体（βヘッダー → まとめ方タブ → 見出し → デッキヒーロー → 予約席 → ランキング見出し →
// ランキング行 → 記録CTA）と同じ骨格・順序・高さに合わせ、
// 読み込み完了時のレイアウトシフトを抑える。
export default function EnvironmentWindowCardSkeleton() {
  return (
    <Card className="shadow-md">
      <CardBody className="gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="h-5 w-11 rounded-full bg-default-100 animate-pulse shrink-0" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <div className="h-3 w-40 rounded bg-default-100 animate-pulse" />
            <div className="h-3 w-52 rounded bg-default-100 animate-pulse" />
          </div>
        </div>

        {/* まとめ方のタブ(h-9 の Tabs)＋その下の注記(1行)。実体と同じ2段で組む */}
        <div className="flex flex-col gap-1.5">
          <div className="h-9 rounded-medium bg-default-100 animate-pulse" />
          <div className="h-3.5 w-60 max-w-full self-center rounded bg-default-100 animate-pulse" />
        </div>

        <div className="h-4 w-56 rounded bg-default-100 animate-pulse" />
        <div className="h-17 rounded-2xl bg-default-100 animate-pulse" />
        <div className="h-31 rounded-xl bg-default-100 animate-pulse" />

        <div className="flex items-center justify-between px-1 -mb-1">
          <div className="h-3 w-44 rounded bg-default-100 animate-pulse" />
          <div className="h-3 w-16 rounded bg-default-100 animate-pulse" />
        </div>

        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            // 行の高さは既定の「1体目でまとめる」の実体に合わせる(実測 105px)。
            // 上段32px・下段20px・内訳の開閉ボタン23px ＋ 間隔と上下の余白
            <div key={i} className="h-26.25 rounded-xl bg-default-100 animate-pulse" />
          ))}
        </div>

        <div className="h-10 rounded-full bg-default-100 animate-pulse" />
      </CardBody>
    </Card>
  );
}
