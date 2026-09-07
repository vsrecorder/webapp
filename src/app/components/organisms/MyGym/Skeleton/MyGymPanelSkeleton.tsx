import { Card, CardBody } from "@heroui/react";

// 読み込み中(骨格)と取得失敗(エラーカード)でパネルが占める高さ。
// 両方に同じ値を持たせて、失敗しても・失敗から骨格へ戻っても寸法が変わらないようにする。
// 値は骨格の中身(h-7 + h-4 + h-12 + h-12 と gap-2.5 3つ = 170px)に
// CardBody の p-3(上下12px)を足したもの。
export const MY_GYM_PLACEHOLDER_HEIGHT = "h-48.5";

// Myジムパネルの骨格。パネル自身の読み込み中表示と、
// ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
export default function MyGymPanelSkeleton() {
  return (
    <Card className={`w-full shadow-md ${MY_GYM_PLACEHOLDER_HEIGHT}`}>
      <CardBody className="flex flex-col gap-2.5 p-3">
        <div className="h-7 w-full animate-pulse rounded-lg bg-default-100" />
        <div className="h-4 w-24 animate-pulse rounded-full bg-default-100" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-default-100" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-default-100" />
      </CardBody>
    </Card>
  );
}
