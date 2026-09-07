import { Card, CardBody } from "@heroui/react";

import SkeletonTextLine from "@app/components/molecules/Skeleton/SkeletonTextLine";

/*
 * 週次デッキ使用率パネル(対戦環境データ)の骨格。
 *
 * 行の骨格(WeeklyDeckUsageSkeletonRow)は実体の WeeklyDeckUsagePanel の読み込み中表示と共有する。
 * 外枠まで共有していないのは、パネル自身は読み込み中でも週セレクタを実物のまま出して
 * 操作できるようにしているため(骨格に差し替えると週を変えられない時間ができる)。
 * ホームの Suspense 骨格はパネルがまだ無い時間に出すものなので、外枠ごと骨格で置く。
 * 実体のレイアウトを変えたらここも追従させること。
 */

/*
 * 実際の行と同じグリッド構成([可変|3.5rem|2.5rem])・同じ要素サイズで骨格を組み、
 * 読み込み完了時のレイアウトシフトを防ぐ。実レイアウトを変えたらここも追従させること。
 *
 * 行の高さは「順位バッジ(24px) + 前週からの順位変動の行」で決まる。変動の行は
 * text-[0.5625rem] leading-none = 9px で、バーの高さ(8px)で代用すると1px 足りない。
 * 文字の行は実体と同じ文字クラスから高さを取ること(SkeletonTextLine)。
 */
export function WeeklyDeckUsageSkeletonRow() {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-default-100 px-3 py-2 animate-pulse">
      {/* 上段: 順位バッジ+変動 / スプライト2体 / 使用率 / 前週差・件数 */}
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] items-center gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col items-center gap-0.5 w-6 shrink-0">
            <div className="w-6 h-6 rounded-full bg-default-200" />
            {/* 前週からの順位変動(▲2 / NEW)。この行が行全体の高さを決める */}
            <SkeletonTextLine textClassName="text-[0.5625rem] leading-none" align="center">
              <span className="w-4 h-2 rounded bg-default-200" />
            </SkeletonTextLine>
          </div>
          <div className="w-16 h-8 rounded-lg bg-default-200 shrink-0" />
        </div>
        {/* 使用率(text-lg leading-none) */}
        <SkeletonTextLine textClassName="text-lg leading-none" align="end">
          <span className="w-10 h-4 rounded-lg bg-default-200" />
        </SkeletonTextLine>
        <div className="flex flex-col items-end gap-0.5">
          {/* 前週差(h-3 の枠)と件数(text-[0.5625rem]。親の leading-none を継ぐ) */}
          <div className="w-7 h-3 rounded bg-default-200" />
          <SkeletonTextLine textClassName="text-[0.5625rem] leading-none" align="end">
            <span className="w-8 h-2 rounded bg-default-200" />
          </SkeletonTextLine>
        </div>
      </div>
      {/* 下段: 使用率バー / 勝率チップ / 勝率の前週差。
          高さを決めているのは3列目で、実体は leading 指定の無い素の span に数値を入れており、
          行ボックスが親の strut(16px × 1.5 = 24px)まで伸びる。チップ(20px)ではなくこちらが
          下段の高さになるので、骨格も同じ組み方にする(前週差が無い行だけは実体も20px になる)。 */}
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] items-center gap-1">
        <div className="h-1.5 rounded-full bg-default-200" />
        <div className="h-5 rounded-full bg-default-200" />
        <span className="text-right">
          <span className="inline-block w-7 h-3 rounded bg-default-200 align-middle" />
        </span>
      </div>
    </div>
  );
}

type Props = {
  // 上位何件まで並べるか。ホームの埋め込みは limit=5 で、6位以下への誘導ボタンが続く
  limit?: number;
};

export default function WeeklyDeckUsagePanelSkeleton({ limit = 5 }: Props) {
  return (
    <Card className="shadow-md">
      <CardBody className="gap-4 p-3">
        {/* β機能の注記(Chip h-5 + 説明2行) */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 rounded-full bg-default-100 animate-pulse shrink-0" />
          <div className="flex flex-1 flex-col">
            <SkeletonTextLine textClassName="text-[0.6875rem] leading-snug">
              <span className="h-2.5 w-52 max-w-full rounded bg-default-100 animate-pulse" />
            </SkeletonTextLine>
            <SkeletonTextLine textClassName="text-[0.6875rem] leading-snug">
              <span className="h-2.5 w-64 max-w-full rounded bg-default-100 animate-pulse" />
            </SkeletonTextLine>
          </div>
        </div>

        {/* 週セレクタ(前後移動ボタン h-8 + select py-2.5 + text-sm = 42px) */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-medium bg-default-100 animate-pulse shrink-0" />
          <div className="h-10.5 flex-1 rounded-xl bg-default-100 animate-pulse" />
          <div className="h-8 w-8 rounded-medium bg-default-100 animate-pulse shrink-0" />
        </div>

        {/* 母集団(期間ラベル text-xs / 人数・のべ件数のボックス / 注記5行) */}
        <div className="flex flex-col items-center gap-1.5 animate-pulse">
          <SkeletonTextLine textClassName="text-xs" align="center">
            <span className="h-3 w-36 rounded bg-default-200" />
          </SkeletonTextLine>
          <div className="h-8 w-full rounded-xl bg-default-100" />
          <div className="flex w-full flex-col items-center">
            {["w-48", "w-52", "w-60", "w-64", "w-64"].map((w, i) => (
              <SkeletonTextLine
                key={i}
                textClassName="text-[0.625rem] leading-snug"
                align="center"
              >
                <span className={`h-2.5 ${w} max-w-full rounded bg-default-200`} />
              </SkeletonTextLine>
            ))}
          </div>
        </div>

        {/* 使用率の算出基準の切り替え(タブ + 分母の説明1行) */}
        <div className="flex flex-col items-center gap-1.5 animate-pulse">
          <div className="h-9 w-full rounded-xl bg-default-100" />
          <SkeletonTextLine textClassName="text-[0.625rem] leading-snug" align="center">
            <span className="h-2.5 w-56 max-w-full rounded bg-default-200" />
          </SkeletonTextLine>
        </div>

        {/* ランキングの並び順(左 text-[0.6875rem] / 右 text-[0.625rem]。行の高さは背の高い左で決まる) */}
        <div className="flex items-center justify-between px-1 -mb-2">
          <SkeletonTextLine textClassName="text-[0.6875rem]">
            <span className="h-3 w-24 rounded bg-default-100 animate-pulse" />
          </SkeletonTextLine>
          <SkeletonTextLine textClassName="text-[0.625rem]">
            <span className="h-3 w-40 max-w-full rounded bg-default-100 animate-pulse" />
          </SkeletonTextLine>
        </div>

        <div className="flex flex-col gap-1.5">
          {Array.from({ length: limit }).map((_, i) => (
            <WeeklyDeckUsageSkeletonRow key={i} />
          ))}
          {/* 「N位以下を見る」(Button h-10)。埋め込みでは常に6位以下があるので場所を確保する */}
          <div className="h-10 rounded-large bg-default-100 animate-pulse" />
        </div>
      </CardBody>
    </Card>
  );
}
