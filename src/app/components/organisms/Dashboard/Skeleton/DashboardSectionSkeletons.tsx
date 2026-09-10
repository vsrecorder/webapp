import { ReactNode } from "react";

import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import { DashboardCalendarSkeleton } from "@app/components/organisms/Calendar/Skeleton/DashboardCalendarSkeleton";
import CityleagueEventsSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventsSkeleton";
import CityleagueOffSeasonCardSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueOffSeasonCardSkeleton";
import BadgeGallerySkeleton from "@app/components/organisms/Badge/Skeleton/BadgeGallerySkeleton";
import EnvironmentBadgeGallerySkeleton from "@app/components/organisms/Badge/Skeleton/EnvironmentBadgeGallerySkeleton";
import OnboardingBadgePanelSkeleton from "@app/components/organisms/Badge/Skeleton/OnboardingBadgePanelSkeleton";
import StreakPanelSkeleton from "@app/components/organisms/Badge/Skeleton/StreakPanelSkeleton";
import MyGymPanelSkeleton from "@app/components/organisms/MyGym/Skeleton/MyGymPanelSkeleton";
import DesignationPanelSkeleton from "@app/components/organisms/Designation/Skeleton/DesignationPanelSkeleton";
import WeeklyDeckUsagePanelSkeleton from "@app/components/organisms/DeckMeta/Skeleton/WeeklyDeckUsagePanelSkeleton";
import UserStatPanelSkeleton from "@app/components/organisms/UserStat/Skeleton/UserStatPanelSkeleton";
import UserProfileCardSkeleton from "@app/components/organisms/User/Skeleton/UserProfileCardSkeleton";
import ChartPanelFallback from "@app/components/organisms/Dashboard/ChartPanelFallback";
import EnvironmentWindowCardSkeleton from "@app/components/organisms/Dashboard/Skeleton/EnvironmentWindowCardSkeleton";
import FirstRecordCtaCardSkeleton from "@app/components/organisms/Dashboard/Skeleton/FirstRecordCtaCardSkeleton";

import {
  DASHBOARD_RECENT_RECORDS_LIMIT,
  DashboardBlockId,
} from "@app/utils/dashboardLayout";

/*
 * ホーム(ダッシュボード)のブロック1つぶんの骨格。
 *
 * 中身は各パネルが自分の読み込み中に出しているものと同じ骨格を使い回す
 * (寸法の作り込みが一箇所で済み、実物との差も出ない)。ここが足すのはその外側 ——
 * セクションの見出し行と、ブロックどうしの間隔だけ。
 *
 * 見出しの文言は Dashboard.tsx の h2 と揃えること。骨格は文字を出さず、同じ文字サイズの
 * 見えないテキストで幅と行の高さを取ってからバーを重ねるので、文言が変わると
 * バーの長さが実物とずれる(高さは変わらない)。
 */

// 見出し(h2 = text-sm font-bold)の骨格。実文言と同じ字送りで場所を取り、その上にバーを重ねる。
// 素の div に高さを決め打ちすると、フォントによって行の高さが 1px 変わって実物とずれる。
function HeadingBar({ label }: { label: string }) {
  return (
    <span className="relative inline-flex items-center self-start">
      <span aria-hidden className="invisible text-sm font-bold">
        {label}
      </span>
      <span className="absolute inset-y-0.5 left-0 right-0 rounded-md bg-default-100 animate-pulse" />
    </span>
  );
}

// 見出しの右端に置くボタン(size="sm" radius="full" h-7 px-3 text-xs font-bold)の骨格。
// 幅は実ラベルの字送りから取る。アイコン付き(シェア)は startContent(14px)と gap(8px)ぶんを足す。
function HeadingButtonBar({
  label,
  hasIcon = false,
}: {
  label: string;
  hasIcon?: boolean;
}) {
  return (
    <span className="relative inline-flex h-7 shrink-0 items-center gap-2 px-3">
      {hasIcon && <span aria-hidden className="invisible h-3.5 w-3.5" />}
      <span aria-hidden className="invisible text-xs font-bold">
        {label}
      </span>
      <span className="absolute inset-0 rounded-full bg-default-100 animate-pulse" />
    </span>
  );
}

// 見出し行。右にボタンが並ぶ節は justify-between で実物と同じ配置にする。
function SectionHeading({
  label,
  action,
  actionHasIcon,
}: {
  label: string;
  action?: string;
  actionHasIcon?: boolean;
}) {
  if (!action) return <HeadingBar label={label} />;

  return (
    <div className="flex items-center justify-between gap-2">
      <HeadingBar label={label} />
      <HeadingButtonBar label={action} hasIcon={actionHasIcon} />
    </div>
  );
}

type Props = {
  id: DashboardBlockId;
  // プロフィールカードは dev 環境だけヘッダーの配色が変わる(実カードと揃える)
  isDevEnv?: boolean;
};

export default function DashboardBlockSkeleton({ id, isDevEnv = false }: Props): ReactNode {
  switch (id) {
    // ---- pinned ----
    case "profile":
      return <UserProfileCardSkeleton isDevEnv={isDevEnv} />;

    case "first_record_cta":
      return <FirstRecordCtaCardSkeleton />;

    case "env_window":
      // プロフィール直下に置かれるときは見出しを持たない
      return <EnvironmentWindowCardSkeleton />;

    // ---- 並べ替え・非表示の対象になるセクション ----
    case "onboarding_badges":
      return (
        <Section>
          <SectionHeading label="はじめの一歩" />
          <OnboardingBadgePanelSkeleton />
        </Section>
      );

    case "streak":
      return (
        <Section>
          <SectionHeading label="ストリーク" />
          <StreakPanelSkeleton />
        </Section>
      );

    case "cityleague":
      return (
        <Section gap="gap-3">
          <SectionHeading label="本日のシティリーグ結果" action="結果を見る" />
          <CityleagueEventsSkeleton />
        </Section>
      );

    // 開催期間外。見出しは同じで、中身が次回シーズンの案内カードに変わる
    case "cityleague_off_season":
      return (
        <Section gap="gap-3">
          <SectionHeading label="本日のシティリーグ結果" action="結果を見る" />
          <CityleagueOffSeasonCardSkeleton />
        </Section>
      );

    case "my_gyms":
      return (
        <Section>
          <SectionHeading label="Myジムのイベント" />
          <MyGymPanelSkeleton />
        </Section>
      );

    case "designation":
      return (
        <Section>
          <SectionHeading label="称号とランク" />
          <DesignationPanelSkeleton />
        </Section>
      );

    case "designation_linked":
      return (
        <Section>
          <SectionHeading label="称号とランク" />
          {/* プレイヤーズクラブ連携済み。「入賞したシティリーグ」の節ぶん背が高い */}
          <DesignationPanelSkeleton linkedHint />
        </Section>
      );

    case "badges":
      return (
        <Section>
          <SectionHeading label="バッジ" />
          <BadgeGallerySkeleton />
        </Section>
      );

    case "environment_badges":
      return (
        <Section>
          <SectionHeading label="対戦環境バッジ" />
          <EnvironmentBadgeGallerySkeleton />
        </Section>
      );

    case "stats":
      return (
        <Section>
          {/* 見出しとシェアボタンは UserStatPanel 自身が描く */}
          <SectionHeading label="戦績分析" action="シェア" actionHasIcon />
          <UserStatPanelSkeleton />
        </Section>
      );

    case "stats_history":
      return (
        <Section>
          <SectionHeading label="月毎の勝率推移" />
          <ChartPanelFallback />
        </Section>
      );

    case "stats_recent":
      return (
        <Section>
          <SectionHeading label="直近N戦の勝率推移" />
          <ChartPanelFallback />
        </Section>
      );

    case "deck_usage":
      // 見出し行はパネル自身が持つ(ChartPanelFallback の withHeading と同じ)
      return (
        <Section>
          <ChartPanelFallback withHeading />
        </Section>
      );

    case "opponent_deck_usage":
      return (
        <Section>
          <ChartPanelFallback withHeading />
        </Section>
      );

    case "environment_meta":
      return (
        <Section>
          <SectionHeading label="対戦環境データ" action="詳しく見る" />
          <WeeklyDeckUsagePanelSkeleton />
        </Section>
      );

    case "environment_meta_window":
      return (
        <Section>
          {/* 組み合わせパネルのときは「詳しく見る」を出さない */}
          <SectionHeading label="対戦環境データ" />
          <EnvironmentWindowCardSkeleton />
        </Section>
      );

    case "calendar":
      return (
        <Section>
          <SectionHeading label="活動ログのカレンダー" />
          <DashboardCalendarSkeleton />
        </Section>
      );

    // ---- trailing ----
    case "recent_records":
      return (
        <Section>
          <SectionHeading label="最近の記録" action="すべて見る" />
          {/* 外枠は Records の一覧グリッド(desktopColumns=3)と同じ指定 */}
          <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2 xl:grid-cols-3 lg:gap-x-6">
            <RecordCardSkeletons
              desktopColumns={3}
              count={DASHBOARD_RECENT_RECORDS_LIMIT}
            />
          </div>
        </Section>
      );
  }
}

// セクションの器。実体の <section className="flex flex-col gap-2"> と同じ間隔で積む
function Section({
  children,
  gap = "gap-2",
}: {
  children: ReactNode;
  gap?: string;
}) {
  return <section className={`flex flex-col ${gap}`}>{children}</section>;
}
