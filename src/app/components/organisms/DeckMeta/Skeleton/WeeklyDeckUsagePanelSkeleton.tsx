import { Card, CardBody } from "@heroui/react";

import SkeletonTextLine from "@app/components/molecules/Skeleton/SkeletonTextLine";
import {
  WeeklyDeckUsageBetaNote,
  WeeklyDeckUsageGroupingNote,
  WeeklyDeckUsageNotes,
  WeeklyDeckUsageRankingHeader,
  WeeklyDeckUsageRateNote,
} from "@app/components/organisms/DeckMeta/WeeklyDeckUsageTexts";
import { UI_DEFAULT_DECK_USAGE_GROUPING } from "@app/utils/deckUsageGrouping";

/*
 * 週次デッキ使用率パネル(対戦環境データ)の骨格。
 *
 * 中身のブロック(母集団・算出基準の切り替え・ランキング)は個別に export し、
 * 実体の WeeklyDeckUsagePanel が読み込み中に出す骨格と共有する。パネル側に同じ形を
 * 書き写すと、片方だけ実体に追従して二段階に跳ねる(ホームは「外枠の骨格 → パネルの
 * 読み込み中表示 → 実体」と2回切り替わるため、食い違いがそのまま2回のズレになる)。
 *
 * 外枠まで共有していないのは、パネル自身は読み込み中でも β注記・週セレクタ・
 * ランキングの見出しを実物のまま出して操作できるようにしているため
 * (骨格に差し替えると週を変えられない時間ができる)。
 * ホームの Suspense 骨格はパネルがまだ無い時間に出すものなので、外枠ごと骨格で置く。
 * 実体のレイアウトを変えたらここも追従させること。
 */

/*
 * 実際の行と同じグリッド構成([可変|3.5rem|2.5rem])・同じ要素サイズで骨格を組み、
 * 読み込み完了時のレイアウトシフトを防ぐ。実レイアウトを変えたらここも追従させること。
 *
 * 行の高さは「順位バッジ(24px) + 前週からの順位変動の枠(h-[0.5625rem])」で決まる。
 * 変動の枠はバーの高さ(8px)で代用すると1px 足りないので、実体と同じクラスで置くこと。
 */
export function WeeklyDeckUsageSkeletonRow({
  withBreakdown = false,
}: {
  // 内訳の開閉ボタンを持つ行か(1体目でまとめた行。個別ページでのみ出る)
  withBreakdown?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-default-100 px-3 py-2 animate-pulse">
      {/* 上段: 順位バッジ+変動 / スプライト2体 / 使用率 / 前週差・件数 */}
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] items-center gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col items-center gap-0.5 w-6 shrink-0">
            <div className="w-6 h-6 rounded-full bg-default-200" />
            {/* 前週からの順位変動(▲2 / NEW)。この枠が行全体の高さを決める */}
            <span className="flex h-[0.5625rem] items-center">
              <span className="w-4 h-2 rounded bg-default-200" />
            </span>
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
      {/* 下段: 使用率バー / 勝率チップ(h-5) / 勝率の前週差(h-3 の枠)。
          高さを決めるのはチップの 20px。実体も3列目を h-3 の枠にして、前週差が無い行
          (NEW など)でも下段が縮まないようにしている。 */}
      <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] items-center gap-1">
        <div className="h-1.5 rounded-full bg-default-200" />
        <div className="h-5 rounded-full bg-default-200" />
        <span className="flex h-3 items-center justify-end">
          <span className="w-7 h-3 rounded bg-default-200" />
        </span>
      </div>
      {withBreakdown && <WeeklyDeckUsageBreakdownToggleSkeleton />}
    </div>
  );
}

/*
 * 内訳の開閉ボタン(「組み合わせの内訳を見る（N種類）」)の骨格。1体目でまとめた行は
 * ほぼすべて内訳を持つので、これが無いと読み込み完了で1行あたり 31px 伸びる(実測)。
 * 実体と同じ枠(mt-0.5 / py-1 / text-[0.625rem] / 14px のアイコン)で高さを作る。
 */
export function WeeklyDeckUsageBreakdownToggleSkeleton() {
  return (
    <div className="mt-0.5 flex items-center justify-center gap-1 py-1">
      <span className="w-3.5 h-3.5" />
      <SkeletonTextLine textClassName="text-[0.625rem]" align="center">
        <span className="w-28 h-2 rounded bg-default-200" />
      </SkeletonTextLine>
    </div>
  );
}

/*
 * 母集団の明示(期間ラベル text-xs / 人数・のべ件数のボックス h-8 / 注記5行)。
 * 文字の行は px で決め打ちせず、実体と同じ文字クラスから高さを取る(SkeletonTextLine)。
 */
export function WeeklyDeckUsageSummarySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* 期間ラベル(データ依存) */}
      <SkeletonTextLine textClassName="text-xs" align="center">
        <span className="h-3 w-36 rounded bg-default-200 animate-pulse" />
      </SkeletonTextLine>
      {/* 人数・のべ件数のボックス(データ依存) */}
      <div className="h-8 w-full rounded-xl bg-default-100 animate-pulse" />
      {/* 注記は固定文言なので実物を置く(バーだと折り返しの回数が幅で変わって合わない) */}
      <WeeklyDeckUsageNotes />
    </div>
  );
}

// デッキのまとめ方の切り替え(タブ h-9 + 説明1行)。
// パネル側は読み込み中も実物のタブを出すので、ここは同じ高さのバーで場所だけ確保する。
export function WeeklyDeckUsageGroupingSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {/* タブ(Tabs の高さ 36px) */}
      <div className="h-9 w-full rounded-xl bg-default-100 animate-pulse" />
      {/* 説明は固定文言。初期表示(1体目でまとめる)のものをそのまま置く */}
      <WeeklyDeckUsageGroupingNote grouping={UI_DEFAULT_DECK_USAGE_GROUPING} />
    </div>
  );
}

type RankingProps = {
  /*
   * 実体と同じ意味の limit。指定時は上位N件だけを並べ、実体と同じく
   * 「N位以下を見る」ボタン(h-10)の場所も確保する。未指定(個別ページ)は
   * 件数が事前に分からないので既定の5行だけ置く。
   */
  limit?: number;
  // 行に内訳の開閉ボタンの段を足すか(1体目でまとめた集計を個別ページで出すとき)
  withBreakdown?: boolean;
};

export function WeeklyDeckUsageRankingSkeleton({ limit, withBreakdown = false }: RankingProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: limit ?? 5 }).map((_, i) => (
        <WeeklyDeckUsageSkeletonRow key={i} withBreakdown={withBreakdown} />
      ))}
      {limit != null && <div className="h-10 rounded-large bg-default-100 animate-pulse" />}
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
        {/* β機能の注記(固定文言。パネルは読み込み中も実物を出すので骨格でも同じものを置く) */}
        <WeeklyDeckUsageBetaNote />

        {/* 週セレクタ(前後移動ボタン h-8 + select py-2.5 + text-sm + 枠線 = 42px)。
            枠線は rem ではないので、幅 640〜767px でルートの文字サイズが上がる帯でも
            揃うよう calc で分けて書く(h-10.5 だと拡大帯で 0.25px ずれる) */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-medium bg-default-100 animate-pulse shrink-0" />
          <div className="h-[calc(2.5rem+2px)] flex-1 rounded-xl bg-default-100 animate-pulse" />
          <div className="h-8 w-8 rounded-medium bg-default-100 animate-pulse shrink-0" />
        </div>

        <WeeklyDeckUsageGroupingSkeleton />
        <WeeklyDeckUsageSummarySkeleton />
        {/* 使用率の分母の説明(固定文言。パネルも読み込み中から実物を出す) */}
        <WeeklyDeckUsageRateNote />

        {/* ランキングの見出し(固定文言。こちらもパネルは読み込み中から実物を出す) */}
        <WeeklyDeckUsageRankingHeader />

        <WeeklyDeckUsageRankingSkeleton limit={limit} />
      </CardBody>
    </Card>
  );
}
