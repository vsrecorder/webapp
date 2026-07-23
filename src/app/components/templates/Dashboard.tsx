import Link from "next/link";
import { Button } from "@heroui/react";

import Footer from "@app/components/organisms/Layout/Footer";
import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";
import DashboardCalendar from "@app/components/organisms/Calendar/DashboardCalendar";
import Records from "@app/components/organisms/Record/Records";
import UserStatPanel from "@app/components/organisms/UserStat/UserStatPanel";
import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";
// chart.js を抱えるパネルは初期JSから切り離すため、ssr:false の動的importでまとめている。
// 詳細は DashboardChartPanels 側のコメントを参照。
import {
  UserStatHistoryChart,
  RecentMatchWinRateChart,
  DeckUsagePanel,
  OpponentDeckUsagePanel,
} from "@app/components/organisms/Dashboard/DashboardChartPanels";
import UserProfileCard from "@app/components/organisms/User/UserProfileCard";
import FirstRecordCtaCard from "@app/components/organisms/Dashboard/FirstRecordCtaCard";
import StreakPanel from "@app/components/organisms/Badge/StreakPanel";
import OnboardingBadgePanel from "@app/components/organisms/Badge/OnboardingBadgePanel";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import EnvironmentBadgeGallery from "@app/components/organisms/Badge/EnvironmentBadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import DashboardSections, {
  DashboardSection,
} from "@app/components/organisms/Dashboard/DashboardSections";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { UserType } from "@app/types/user";
import { UserStatType } from "@app/types/user_stat";
import { isDevEnv } from "@app/utils/appIcon";
import { isFirstRecordCtaEnabled } from "@app/utils/featureFlags";

import { upstreamUrl } from "@app/utils/upstream";

// マスタデータ（対戦環境・スタンダードレギュレーション・チャンピオンシップシリーズ）の
// キャッシュ期間（秒）。滅多に増えないため長めに取る。
const MASTER_DATA_REVALIDATE_SEC = 3600;

// 日次更新のデータ（シティリーグ開催情報・対戦環境）のキャッシュ期間（秒）。
// 非会員向けの Home.tsx と同じ値に揃える。
const DAILY_DATA_REVALIDATE_SEC = 300;

async function getCityleagueScheduleByDate(date: Date): Promise<CityleagueScheduleType> {
  const today = date.toISOString().split("T")[0];

  const res = await fetch(
    upstreamUrl`/api/v1beta/cityleague_schedules?date=${today}`,
    {
      // シティリーグの開催情報は最大でも日次更新のため、毎回取得(no-store)は不要。
      // キャッシュしてサーバ応答(TTFB)を短縮する。
      next: { revalidate: DAILY_DATA_REVALIDATE_SEC },
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (res.status === 200) return res.json();
  throw new Error("not found");
}

async function getEnvironmentByDate(date: Date): Promise<EnvironmentType> {
  const today = date.toISOString().split("T")[0];

  const res = await fetch(upstreamUrl`/api/v1beta/environments?date=${today}`, {
    // 対戦環境情報も日次更新のため、キャッシュしてTTFBを短縮する。
    next: { revalidate: DAILY_DATA_REVALIDATE_SEC },
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
  const res = await fetch(upstreamUrl`/api/v1beta/users/${userId}`, {
    // ユーザ自身が編集した名前・アイコンを即座に反映したいため、ここはキャッシュしない。
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return null;
}

// 記録0件判定用に、全期間の対戦記録件数を取得する（施策0-6 CTAの表示条件）。
// クエリ無しで叩くと全期間の集計が返る（user_stat.total_records）。
// 失敗時は null を返し、CTAは「出さない」側に倒す（誤表示より非表示を優先）。
async function getUserTotalRecords(userId: string): Promise<number | null> {
  const res = await fetch(upstreamUrl`/api/v1beta/users/${userId}/stats`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) {
    const stat: UserStatType = await res.json();
    return stat.total_records;
  }
  return null;
}

// 登録日(created_at)から、計測ラベル用のコホート週(登録週の月曜日 YYYY-MM-DD, JST基準)と
// 登録からの経過日数を求める。コホートで表示を絞るためではなく、GAイベントに付与するだけ。
function computeCohort(createdAt: UserType["created_at"] | undefined): {
  cohortWeek?: string;
  daysSinceSignup?: number;
} {
  if (createdAt == null) return {};

  const created = new Date(String(createdAt));
  if (Number.isNaN(created.getTime())) return {};

  const DAY_MS = 24 * 60 * 60 * 1000;
  // JSTの壁時計に合わせるため +9h してから日付部分を扱う。
  const createdJst = new Date(created.getTime() + 9 * 60 * 60 * 1000);
  const dayOfWeek = createdJst.getUTCDay(); // 0=日曜
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(createdJst.getTime() - diffToMonday * DAY_MS);
  const cohortWeek = monday.toISOString().split("T")[0];

  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const daysSinceSignup = Math.floor(
    (nowJst.getTime() - createdJst.getTime()) / DAY_MS,
  );

  return { cohortWeek, daysSinceSignup };
}

async function getAllEnvironments(): Promise<EnvironmentType[]> {
  const res = await fetch(upstreamUrl`/api/v1beta/environments`, {
    next: { revalidate: MASTER_DATA_REVALIDATE_SEC },
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

async function getAllStandardRegulations(): Promise<StandardRegulationType[]> {
  const res = await fetch(upstreamUrl`/api/v1beta/standard_regulations`, {
    next: { revalidate: MASTER_DATA_REVALIDATE_SEC },
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

async function getAllChampionshipSeries(): Promise<ChampionshipSeriesType[]> {
  const res = await fetch(upstreamUrl`/api/v1beta/championship_series`, {
    next: { revalidate: MASTER_DATA_REVALIDATE_SEC },
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

export default async function TemplateDashboard({ userId }: Props) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);

  // 施策0-6: 記録0件のユーザーにだけ「最初の記録を作る」CTAを出す。
  // トグルが無効なら件数取得自体をスキップして無駄な往復を省く。
  const ctaEnabled = isFirstRecordCtaEnabled();

  // 各取得は互いに独立しているため、直列に await すると往復回数ぶん
  // そのままサーバ応答(TTFB)が伸びる。並列化して全体の待ち時間を最も遅い1本ぶんに抑える。
  // シティリーグ開催情報と対戦環境は「無ければ undefined」で描画を続ける仕様のため、
  // ここで catch して他の取得を巻き込んで失敗させない。
  const [
    cs,
    env,
    environments,
    standardRegulations,
    championshipSeries,
    user,
    totalRecords,
  ] = await Promise.all([
    getCityleagueScheduleByDate(date).catch(() => undefined),
    getEnvironmentByDate(date).catch(() => undefined),
    getAllEnvironments(),
    getAllStandardRegulations(),
    getAllChampionshipSeries(),
    getUser(userId),
    ctaEnabled
      ? getUserTotalRecords(userId).catch(() => null)
      : Promise.resolve<number | null>(null),
  ]);

  // 記録がちょうど0件のときだけ表示。取得失敗(null)時は非表示に倒す。
  const showFirstRecordCta = ctaEnabled && totalRecords === 0;
  const cohort = showFirstRecordCta ? computeCohort(user?.created_at) : {};

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

  // 対戦環境バッジ
  sections.push({
    id: "environment_badges",
    label: "対戦環境バッジ",
    node: (
      <section key="environment_badges" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">対戦環境バッジ</h2>
        <EnvironmentBadgeGallery userId={userId} />
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

  // 対戦環境分析（プラットフォーム全体の週次デッキ使用率・β機能）
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
        <WeeklyDeckUsagePanel limit={5} />
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
          userId={userId}
          pinned={
            user ? (
              <div className="flex flex-col gap-3 lg:gap-6">
                <UserProfileCard
                  key="pinned"
                  user={user}
                  isDevEnv={isDevEnv()}
                  userCreatedAt={
                    user.created_at != null ? String(user.created_at) : undefined
                  }
                />
                {/*
                  施策0-6 止血: 記録0件のユーザーにだけ、プロフィールカードの直後に
                  最初の1件を促すCTAを出す。DashboardSections の sections に混ぜると
                  多段組(columns-2)や並べ替え・非表示の対象になってしまうため、pinned 内に
                  プロフィールカードと並べて固定で描画する。
                */}
                {showFirstRecordCta && (
                  <FirstRecordCtaCard
                    cohortWeek={cohort.cohortWeek}
                    daysSinceSignup={cohort.daysSinceSignup}
                  />
                )}
              </div>
            ) : undefined
          }
          sections={sections}
          trailing={recentRecords}
        />
      </div>

      <Footer />
    </>
  );
}
