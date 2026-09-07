import { Fragment } from "react";
import { Card, CardBody } from "@heroui/react";

import { BadgeTileSkeleton } from "@app/components/organisms/Badge/badgeUi";

/*
 * バッジパネルの骨格。パネル自身の読み込み中表示と、
 * ホームの Suspense 骨格(DashboardSkeleton)の両方から使う。
 *
 * カテゴリの並び(BADGE_CATEGORY_ORDER)は実体の BadgeGallery でも使う。骨格の行数は
 * これで決まるので、片方だけ増えて寸法がずれないよう定義をここに置いて共有する。
 */
export const BADGE_CATEGORY_ORDER = ["milestone"];

// BadgeFlowRow と同じ構造(タイル+"▶"区切り)のプレースホルダー。
// マイルストーンは実際は▶で繋がる横並びのため、区切り分の幅もスケルトンに反映する。
// 行の高さは一番背の高いタイル(=一番長いバッジ名)で決まるので、その名前を nameSample に渡す。
function BadgeFlowRowSkeleton({ count, nameSample }: { count: number; nameSample: string }) {
  return (
    <div className="flex items-stretch gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Fragment key={i}>
          <div className="flex-1 min-w-0">
            <BadgeTileSkeleton nameSample={nameSample} />
          </div>
          {i < count - 1 && (
            <span className="self-center shrink-0 text-default-300 font-black text-xs">
              ▶
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function BadgeGallerySkeleton() {
  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-4">
        {/* 獲得数(text-xs = 16px の行)とシーズン選択(border + py-1.5 + text-xs = 30px) */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 flex items-center">
            <div className="w-20 h-3 rounded-full bg-default-100 animate-pulse" />
          </div>
          <div className="w-24 h-7.5 rounded-xl bg-default-100 animate-pulse" />
        </div>

        {BADGE_CATEGORY_ORDER.map((category) => (
          <div key={category} className="flex flex-col gap-2">
            {/* カテゴリ名(text-[0.6875rem] の行 = 16.5px。px はルート16px時) */}
            <div className="h-[1.03125rem] flex items-center">
              <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, subIndex) => (
                <div key={subIndex} className="flex flex-col gap-1.5">
                  {/* 系統名(text-[0.625rem] の行 = 15px。px はルート16px時) */}
                  <div className="h-[0.9375rem] flex items-center">
                    <div className="w-14 h-2 rounded-full bg-default-100 animate-pulse" />
                  </div>
                  {/* マイルストーンは「駆け出し/熟練/達人/伝説の」×「ユーザー/ビルダー/バトラー」。
                      一番長いのは前半4文字の「駆け出し◯◯◯◯」 */}
                  <BadgeFlowRowSkeleton count={4} nameSample="駆け出しユーザー" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
