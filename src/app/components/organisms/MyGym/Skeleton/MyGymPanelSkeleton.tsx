import { Card, CardBody } from "@heroui/react";

import {
  DEFAULT_MY_GYM_SKELETON,
  MyGymSkeletonShape,
  myGymSkeletonHeightRem,
} from "@app/utils/myGymSkeleton";

/*
 * Myジムパネルの骨格。パネル自身の読み込み中表示・取得失敗時のエラーカードの寸法・
 * ホームの Suspense 骨格(DashboardSkeleton)で共有する。
 *
 * 実体は中身で高さが3倍以上変わる(390x844 の実測で 未登録 184px / 予定0件 106px /
 * 日付7本 354px)ので、前回このユーザーのホームが描いた形(utils/myGymSkeleton の cookie)
 * を受け取り、その形で場所を取る。各ブロックの寸法は実体を実測した値に合わせてある。
 */

// 日付見出し1本が占める高さ。実体は開閉ボタンで、右に出る会場チップ(h-5 = 1.25rem)に
// 上下の padding(py-1.5)が乗って 2rem になる(min-h-8)。
const DATE_ROW_HEIGHT = "h-8";
// 日付の文字ぶん。実体は text-[0.6875rem] の行ボックス(0.6875 × 1.5 = 1.03125rem)。
// px で書くと拡大帯(ルート112.5%)だけ実体と太さが変わる。
const DATE_BAR_HEIGHT = "h-[1.03125rem]";
// 会場チップ。高さは実体と同じ h-5 で、幅は実データの店舗名(4店舗で 115.8〜166.5px)の
// 中ほどに置く。右端の pr-6 は実体が「+N」のために常に空けている場所。
const VENUE_CHIP_WIDTH = "w-37";

type Props = {
  // 前回このユーザーのホームが描いた形。cookie が無ければ既定の形で出す
  shape?: MyGymSkeletonShape;
};

export default function MyGymPanelSkeleton({ shape = DEFAULT_MY_GYM_SKELETON }: Props) {
  // 高さは rem。クラス名を組み立てると Tailwind が拾えないので style で渡す
  const style = { height: `${myGymSkeletonHeightRem(shape)}rem` };

  // 未登録。実体はパネル全体が登録への導線(アイコン・2種の文言・ボタンを中央に積む)
  if (shape.kind === "unregistered") {
    return (
      <Card className="w-full shadow-md" style={style}>
        <CardBody className="flex flex-col items-center gap-3 px-4 py-6">
          <div className="h-6 w-6 animate-pulse rounded-lg bg-default-100" />
          {/* 見出し(text-sm の行 = 1.25rem)と説明の2行(text-xs = 1rem) */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-5 items-center">
              <div className="h-3.5 w-52 animate-pulse rounded-full bg-default-100" />
            </div>
            <div className="flex h-4 items-center">
              <div className="h-2.5 w-44 animate-pulse rounded-full bg-default-100" />
            </div>
            <div className="flex h-4 items-center">
              <div className="h-2.5 w-52 animate-pulse rounded-full bg-default-100" />
            </div>
          </div>
          {/* 「Myジムを登録する」(Button size="sm" = 2rem) */}
          <div className="h-8 w-40 animate-pulse rounded-full bg-default-100" />
        </CardBody>
      </Card>
    );
  }

  // 登録済みで予定なし。実体は登録中の行の下に文言が1行(py-4)だけ入る
  if (shape.kind === "noEvents") {
    return (
      <Card className="w-full shadow-md" style={style}>
        <CardBody className="flex flex-col gap-2.5 p-3">
          <div className="h-6 w-full animate-pulse rounded-lg bg-default-100" />
          <div className="flex h-12 items-center justify-center">
            <div className="h-2.5 w-56 animate-pulse rounded-full bg-default-100" />
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-md" style={style}>
      <CardBody className="flex flex-col gap-2.5 p-3">
        <div className="h-6 w-full animate-pulse rounded-lg bg-default-100" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: shape.rows }, (_, i) => (
            <div
              key={i}
              className={`${DATE_ROW_HEIGHT} flex items-center justify-between pr-6`}
            >
              <div
                className={`${DATE_BAR_HEIGHT} w-24 animate-pulse rounded-full bg-default-100`}
              />
              <div
                className={`h-5 ${VENUE_CHIP_WIDTH} animate-pulse rounded-full bg-default-100`}
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
