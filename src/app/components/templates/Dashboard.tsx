import Link from "next/link";
import { Button } from "@heroui/react";

import Footer from "@app/components/organisms/Layout/Footer";
import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";
import DashboardCalendar from "@app/components/organisms/Calendar/DashboardCalendar";
import Records from "@app/components/organisms/Record/Records";
import UserStatPanel from "@app/components/organisms/UserStat/UserStatPanel";
import UserStatHistoryChart from "@app/components/organisms/UserStat/UserStatHistoryChart";
import RecentMatchWinRateChart from "@app/components/organisms/UserStat/RecentMatchWinRateChart";
import DeckUsagePanel from "@app/components/organisms/DeckUsage/DeckUsagePanel";
import OpponentDeckUsagePanel from "@app/components/organisms/DeckUsage/OpponentDeckUsagePanel";
import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";
import UserProfileCard from "@app/components/organisms/User/UserProfileCard";
import StreakPanel from "@app/components/organisms/Badge/StreakPanel";
import OnboardingBadgePanel from "@app/components/organisms/Badge/OnboardingBadgePanel";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import DashboardSections, {
  DashboardSection,
} from "@app/components/organisms/Dashboard/DashboardSections";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { UserType } from "@app/types/user";

async function getCityleagueScheduleByDate(date: Date): Promise<CityleagueScheduleType> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const today = date.toISOString().split("T")[0];

  const res = await fetch(
    `https://${domain}/api/v1beta/cityleague_schedules?date=${today}`,
    {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (res.status === 200) return res.json();
  throw new Error("not found");
}

async function getEnvironmentByDate(date: Date): Promise<EnvironmentType> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const today = date.toISOString().split("T")[0];

  const res = await fetch(`https://${domain}/api/v1beta/environments?date=${today}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  throw new Error("error");
}

type Props = {
  userId: string;
};

async function getUser(userId: string): Promise<UserType | null> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${userId}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return null;
}

async function getAllEnvironments(): Promise<EnvironmentType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/environments`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

async function getAllStandardRegulations(): Promise<StandardRegulationType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/standard_regulations`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

async function getAllChampionshipSeries(): Promise<ChampionshipSeriesType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/championship_series`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

export default async function TemplateDashboard({ userId }: Props) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);

  let cs: CityleagueScheduleType | undefined;
  try {
    cs = await getCityleagueScheduleByDate(date);
  } catch {
    cs = undefined;
  }

  let env: EnvironmentType | undefined;
  try {
    env = await getEnvironmentByDate(date);
  } catch {
    env = undefined;
  }

  const environments = await getAllEnvironments();
  const standardRegulations = await getAllStandardRegulations();
  const championshipSeries = await getAllChampionshipSeries();
  const user = await getUser(userId);

  const sections: DashboardSection[] = [];

  // はじめの一歩
  sections.push({
    id: "onboarding_badges",
    label: "はじめの一歩",
    node: (
      <section key="onboarding_badges" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">はじめの一歩</h2>
        <OnboardingBadgePanel userId={userId} />
      </section>
    ),
  });

  // 本日のシティリーグ
  if (cs) {
    sections.push({
      id: "cityleague",
      label: "本日のシティリーグ",
      node: (
        <section key="cityleague" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-default-700">{cs.title} 開催中</h2>
            <Button
              as={Link}
              href="/cityleague_results"
              size="sm"
              variant="light"
              color="primary"
              radius="full"
              className="text-xs font-bold h-7 px-3"
            >
              結果を見る
            </Button>
          </div>
          <CityleagueEvents />
        </section>
      ),
    });
  }

  // 称号とランク
  sections.push({
    id: "designation",
    label: "称号とランク",
    node: (
      <section key="designation" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">称号とランク</h2>
        <DesignationPanel userId={userId} championshipSeries={championshipSeries} />
      </section>
    ),
  });

  // バッジ
  sections.push({
    id: "badges",
    label: "バッジ",
    node: (
      <section key="badges" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">バッジ</h2>
        <BadgeGallery userId={userId} championshipSeries={championshipSeries} />
      </section>
    ),
  });

  // ストリーク
  sections.push({
    id: "streak",
    label: "ストリーク",
    node: (
      <section key="streak" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">ストリーク</h2>
        <StreakPanel userId={userId} />
      </section>
    ),
  });

  // 戦績分析
  sections.push({
    id: "stats",
    label: "戦績分析",
    node: (
      <section key="stats" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">戦績分析</h2>
        <UserStatPanel
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          standardRegulations={standardRegulations}
          championshipSeries={championshipSeries}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // 月毎の勝率推移
  sections.push({
    id: "stats_history",
    label: "月毎の勝率推移",
    node: (
      <section key="stats_history" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">月毎の勝率推移</h2>
        <UserStatHistoryChart userId={userId} championshipSeries={championshipSeries} />
      </section>
    ),
  });

  // 直近N戦の勝率推移
  sections.push({
    id: "stats_recent",
    label: "直近N戦の勝率推移",
    node: (
      <section key="stats_recent" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">直近N戦の勝率推移</h2>
        <RecentMatchWinRateChart userId={userId} />
      </section>
    ),
  });

  // デッキ使用率分析
  sections.push({
    id: "deck_usage",
    label: "デッキ使用率分析",
    node: (
      <section key="deck_usage" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">デッキ使用率分析</h2>
        <DeckUsagePanel
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          standardRegulations={standardRegulations}
          championshipSeries={championshipSeries}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // 対戦相手のデッキ分布
  sections.push({
    id: "opponent_deck_usage",
    label: "対戦相手のデッキ分布",
    node: (
      <section key="opponent_deck_usage" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">対戦相手のデッキ分布</h2>
        <OpponentDeckUsagePanel
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          standardRegulations={standardRegulations}
          championshipSeries={championshipSeries}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // 対戦環境分析（プラットフォーム全体の週次デッキ使用率・アルファ版）
  sections.push({
    id: "environment_meta",
    label: "対戦環境分析",
    node: (
      <section key="environment_meta" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-default-700">対戦環境分析</h2>
          <Button
            as={Link}
            href="/deck_meta"
            size="sm"
            variant="light"
            color="primary"
            radius="full"
            className="text-xs font-bold h-7 px-3"
          >
            詳しく見る
          </Button>
        </div>
        <WeeklyDeckUsagePanel />
      </section>
    ),
  });

  // 活動ログのカレンダー
  sections.push({
    id: "calendar",
    label: "活動ログのカレンダー",
    node: (
      <section key="calendar" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">活動ログのカレンダー</h2>
        <DashboardCalendar userId={userId} />
      </section>
    ),
  });

  const recentRecords = (
    <section key="recent-records" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-default-700">最近の記録</h2>
        <Button
          as={Link}
          href="/records"
          size="sm"
          variant="light"
          color="primary"
          radius="full"
          className="text-xs font-bold h-7 px-3"
        >
          すべて見る
        </Button>
      </div>
      <Records event_type="all" disable_more_load={true} limit={10} desktopColumns={3} />
    </section>
  );

  return (
    <>
      <div className="pt-3 lg:pt-9 xl:pt-9 max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full">
        <DashboardSections
          pinned={user ? <UserProfileCard key="pinned" user={user} /> : undefined}
          sections={sections}
          trailing={recentRecords}
        />
      </div>

      <Footer />
    </>
  );
}
