import LinkButton from "@app/components/molecules/LinkButton";

import Footer from "@app/components/organisms/Layout/Footer";
import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";
import CityleagueOffSeasonCard from "@app/components/organisms/Cityleague/CityleagueOffSeasonCard";
import DashboardCalendar from "@app/components/organisms/Calendar/DashboardCalendar";
import MyGymPanel from "@app/components/organisms/MyGym/MyGymPanel";
import Records from "@app/components/organisms/Record/Records";
import UserStatPanel from "@app/components/organisms/UserStat/UserStatPanel";
import WeeklyDeckUsagePanel from "@app/components/organisms/DeckMeta/WeeklyDeckUsagePanel";
// chart.js を抱えるパネルは初期JSから切り離すため、ssr:false の動的importでまとめている。
// 詳細は DashboardChartPanels 側のコメントを参照。
import {
  UserStatHistoryChart,
  DeckUsagePanel,
  OpponentDeckUsagePanel,
} from "@app/components/organisms/Dashboard/DashboardChartPanels";
import UserProfileCard from "@app/components/organisms/User/UserProfileCard";
import FirstRecordCtaCard from "@app/components/organisms/Dashboard/FirstRecordCtaCard";
import QuickStartModal from "@app/components/organisms/Dashboard/QuickStartModal";
import EnvironmentWindowCard from "@app/components/organisms/Dashboard/EnvironmentWindowCard";
import StreakPanel from "@app/components/organisms/Badge/StreakPanel";
import OnboardingBadgePanel from "@app/components/organisms/Badge/OnboardingBadgePanel";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import EnvironmentBadgeGallery from "@app/components/organisms/Badge/EnvironmentBadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import DashboardSections, {
  DashboardSection,
} from "@app/components/organisms/Dashboard/DashboardSections";
import DeferUntilVisible from "@app/components/organisms/Dashboard/DeferUntilVisible";
import { DashboardCalendarSkeleton } from "@app/components/organisms/Calendar/Skeleton/DashboardCalendarSkeleton";
import WeeklyDeckUsagePanelSkeleton from "@app/components/organisms/DeckMeta/Skeleton/WeeklyDeckUsagePanelSkeleton";
import EnvironmentWindowCardSkeleton from "@app/components/organisms/Dashboard/Skeleton/EnvironmentWindowCardSkeleton";
import { RecordCardSkeletons } from "@app/components/organisms/Record/Skeleton/RecordCardSkeleton";
import {
  DASHBOARD_RECENT_RECORDS_LIMIT,
  DashboardBlockId,
  splitDashboardLayout,
} from "@app/utils/dashboardLayout";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { UserType } from "@app/types/user";
import { RecordGetResponseType } from "@app/types/record";
import { isDevEnv } from "@app/utils/appIcon";
import {
  isFirstRecordCtaEnabled,
  isEnvWindowEnabled,
  isQuickStartModalEnabled,
} from "@app/utils/featureFlags";

import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";
import { getAllChampionshipSeries } from "@app/utils/championshipSeriesServer";
import { getDashboardInitialData } from "@app/utils/dashboardServer";
import { DEFAULT_EXCLUDE_DEFAULT_MATCHES } from "@app/utils/excludeDefaultMatches";
import { pickCityleagueScheduleState } from "@app/utils/cityleagueSchedule";
import { todayJSTDateString } from "@app/utils/date";

import { getJstNow } from "@app/utils/calendar";

// マスタデータ（対戦環境・スタンダードレギュレーション・チャンピオンシップシリーズ）の
// キャッシュ期間（秒）。滅多に増えないため長めに取る。
const MASTER_DATA_REVALIDATE_SEC = 3600;

// 日次更新のデータ（シティリーグ開催情報・対戦環境）のキャッシュ期間（秒）。
// 非会員向けの Home.tsx と同じ値に揃える。
const DAILY_DATA_REVALIDATE_SEC = 300;

/*
 * シティリーグのシーズン(開催期間)を全件取る。
 *
 * 日付を指定して1件だけ引くこともできるが、それだと開催期間外に「次はいつ始まるのか」を
 * 出せない。全件から今日の状態を決める(pickCityleagueScheduleState)。
 * 日付をURLに含めないぶんキャッシュのキーが日をまたいでも変わらず、
 * /cityleague_results が引くのと同じエントリに相乗りできる。
 */
async function getAllCityleagueSchedules(): Promise<CityleagueScheduleType[]> {
  const res = await fetch(upstreamUrl`/api/v1beta/cityleague_schedules`, {
    // シティリーグの開催情報は最大でも日次更新のため、毎回取得(no-store)は不要。
    // キャッシュしてサーバ応答(TTFB)を短縮する。
    next: { revalidate: DAILY_DATA_REVALIDATE_SEC },
    method: "GET",
    headers: { Accept: "application/json" },
  });

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
  /*
   * このユーザーのホームが前回描いた並び(cookie 由来。page.tsx が読む)。
   * DashboardSections が表示設定(localStorage)を読むまでの繋ぎに、この構成で骨格を出す。
   */
  storedLayout?: readonly DashboardBlockId[];
  /*
   * 不戦勝・不戦敗を戦績集計から外すか(cookie 由来。page.tsx が読む)。
   * localStorage を読めるまでの繋ぎで、各パネルの最初の描画とサーバでの取得に使う。
   * cookie が無い初回訪問は undefined(既定に従う)。
   */
  excludeDefaultMatches?: boolean;
  /*
   * 戦績を表示するか(cookie 由来。page.tsx が読む)。
   * トレーナー情報パネルの最初の描画に使う。cookie が無い初回訪問は undefined(既定=表示)。
   */
  statsVisible?: boolean;
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

// 全期間の対戦記録件数を「最大3件」だけ取得して数える（施策0-6 CTA=0件 / 施策E-2=3件未満の判定用）。
// 返す値は 0〜3 にキャップされる（3 は「3件以上」を意味する）。
//
// 注意: user_stat の total_records は使えない。`/users/:id/stats` はクエリ無しだと
// 「当月」の集計を返すため（全期間ではない）、月初に履歴のあるユーザーへ誤って CTA/カードを
// 出してしまう。records 一覧を limit=3 で引き、その件数で全期間の到達状況を判定する。
//
// records 一覧はトークンの uid 基準（要認証）のため、webapp の /api routes と同じ方式で
// 短命 JWT を署名して呼ぶ（userId は page.tsx で session.user.id を渡しており本人のみ）。
// 失敗時は null を返し、CTA・カードは「出さない」側に倒す（誤表示より非表示を優先）。
async function getCappedRecordCount(userId: string): Promise<number | null> {
  const token = signUpstreamToken(userId);

  const res = await fetch(upstreamUrl`/api/v1beta/records?limit=3`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (res.status === 200) {
    const data: RecordGetResponseType = await res.json();
    return data.records.length; // 0〜3。3なら「3件以上」の意味
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
  const daysSinceSignup = Math.floor((nowJst.getTime() - createdJst.getTime()) / DAY_MS);

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

export default async function TemplateDashboard({
  userId,
  storedLayout,
  excludeDefaultMatches,
  statsVisible,
}: Props) {
  const date = getJstNow();

  // 施策0-6: 記録0件のユーザーにだけ「最初の記録を作成する」CTAを出す。
  // 施策E-2: 同じく記録0件のユーザーに「環境の窓」カードを出す。
  // クイックスタートモーダル: 同じく記録0件のユーザーに、開いた直後の導線として自動表示する。
  // どのトグルも無効なら件数取得自体をスキップして無駄な往復を省く。
  const ctaEnabled = isFirstRecordCtaEnabled();
  const envWindowEnabled = isEnvWindowEnabled();
  const quickStartModalEnabled = isQuickStartModalEnabled();
  const needTotalRecords = ctaEnabled || envWindowEnabled || quickStartModalEnabled;

  // 各取得は互いに独立しているため、直列に await すると往復回数ぶん
  // そのままサーバ応答(TTFB)が伸びる。並列化して全体の待ち時間を最も遅い1本ぶんに抑える。
  // シティリーグ開催情報と対戦環境は「無ければ undefined」で描画を続ける仕様のため、
  // ここで catch して他の取得を巻き込んで失敗させない。
  const [
    schedules,
    env,
    environments,
    standardRegulations,
    championshipSeries,
    user,
    totalRecords,
  ] = await Promise.all([
    getAllCityleagueSchedules().catch(() => undefined),
    getEnvironmentByDate(date).catch(() => undefined),
    getAllEnvironments(),
    getAllStandardRegulations(),
    getAllChampionshipSeries(),
    getUser(userId),
    needTotalRecords
      ? getCappedRecordCount(userId).catch(() => null)
      : Promise.resolve<number | null>(null),
  ]);

  /*
   * 今日がシーズン(開催期間)の中かどうかと、期間外なら次に始まるシーズン。
   * 「本日のシティリーグ結果」はどちらの場合も出し、中身だけ入れ替える。
   *
   * schedules が undefined なのは取得に失敗したとき。期間の判定ができないので
   * 「開催期間外」と言い切らず、当日の会場を自分で取りに行く CityleagueEvents に任せる
   * (期間中なら会場が出るし、開催の無い日はそちらの空状態が出る)。
   */
  const { ongoing: cs, next: nextCs } = pickCityleagueScheduleState(
    schedules,
    todayJSTDateString(),
  );
  const showOffSeasonCard = schedules !== undefined && cs === null;

  /*
   * 各パネル(バッジ・ストリーク・称号・戦績・プロフィール)が最初に出す値を、ここでまとめて取る。
   *
   * 上の取得のあとに置いているのは、シーズン(championshipSeries)と当日の対戦環境(env)が
   * 決まらないと同じクエリを投げられないため。どちらもキャッシュ付き(マスタ/日次)なので、
   * 直列にしても実質の待ちはほとんど無い。
   * 対戦環境は UserStatPanel の初期値と同じ「今日の環境、無ければ一覧の先頭」に揃えること。
   */
  const panels = await getDashboardInitialData(
    userId,
    championshipSeries,
    env?.id ?? environments[0]?.id ?? "",
    excludeDefaultMatches ?? DEFAULT_EXCLUDE_DEFAULT_MATCHES,
  );

  // totalRecords は「全期間の記録件数（0〜3にキャップ）」。3 は「3件以上」の意味。
  // 「最初の記録」CTAは記録0件のときだけ。取得失敗(null)時は非表示に倒す。
  const showFirstRecordCta = ctaEnabled && totalRecords === 0;
  // クイックスタートモーダルも記録0件のときだけ。取得失敗(null)時は非表示に倒す。
  // 実際に開くかどうか（前回閉じてから3日空いたか）はクライアント側で判定する。
  const showQuickStartModal = quickStartModalEnabled && totalRecords === 0;
  // 組み合わせパネル(環境ウィンドウ E-2 ＋ 対戦環境分析)。記録数で配置を出し分ける(境界=3件):
  //  ・3件未満 → プロフィール直下(pinned)。価値の後払いゾーン(blindspots §2)に前倒しで見せる。
  //  ・3件以上 → 「対戦環境分析」セクションの位置。実勝率での「あなたの勝率 vs 環境平均勝率」比較が主役になる。
  // フラグ無効・件数取得失敗(null)時は組み合わせパネルを出さず、セクションは従来の
  // WeeklyDeckUsagePanel をフォールバック表示する(対戦環境分析を全員から消さないため)。
  const combinedEnabled = envWindowEnabled && totalRecords !== null;
  const combinedAtTop = combinedEnabled && (totalRecords as number) < 3;
  const combinedAtSection = combinedEnabled && (totalRecords as number) >= 3;
  const cohort = computeCohort(user?.created_at);

  const sections: DashboardSection[] = [];

  // はじめの一歩
  sections.push({
    id: "onboarding_badges",
    label: "はじめの一歩",
    node: (
      <section key="onboarding_badges" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">はじめの一歩</h2>
        <OnboardingBadgePanel userId={userId} initialBadges={panels.badges} />
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
        <StreakPanel userId={userId} initialStreak={panels.streak} />
      </section>
    ),
  });

  /*
   * 本日のシティリーグ結果。
   *
   * シティリーグは年に数回のシーズンにまとまって開催される。以前は開催期間外だと
   * この節ごと消していたが、それだとホームの構成が時期によって変わり、利用者からは
   * 「パネルが消えた」ように見える。節は常に出し、中身だけ入れ替える:
   *   ・開催期間中(と、期間が分からなかったとき) … 当日の会場一覧(CityleagueEvents)
   *   ・開催期間外 … 次に始まるシーズンの案内(CityleagueOffSeasonCard)
   * 骨格も背丈が違うので skeletonId で分ける。
   */
  sections.push({
    id: "cityleague",
    label: "本日のシティリーグ結果",
    skeletonId: showOffSeasonCard ? "cityleague_off_season" : "cityleague",
    node: (
      <section key="cityleague" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-default-700">本日のシティリーグ結果</h2>
          <LinkButton
            href="/cityleague_results"
            size="sm"
            variant="light"
            color="primary"
            radius="full"
            className="text-xs font-bold h-7 px-3"
          >
            結果を見る
          </LinkButton>
        </div>
        {showOffSeasonCard ? (
          <CityleagueOffSeasonCard next={nextCs} />
        ) : (
          <CityleagueEvents />
        )}
      </section>
    ),
  });

  // Myジム(登録した店舗のイベント予定)
  sections.push({
    id: "my_gyms",
    label: "Myジム",
    node: (
      <section key="my_gyms" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">Myジムのイベント</h2>
        <MyGymPanel initialEvents={panels.myGymEvents} initialRange={panels.myGymRange} />
      </section>
    ),
  });

  // 称号とランク
  sections.push({
    id: "designation",
    label: "称号とランク",
    // 連携済みだと「入賞したシティリーグ」の節が増えるので、骨格もそちらに合わせる。
    // 判定は panels.userPlayer(null は「取れた上で未連携」/ undefined は取得失敗)
    skeletonId: panels.userPlayer != null ? "designation_linked" : "designation",
    node: (
      <section key="designation" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">称号とランク</h2>
        <DesignationPanel
          userId={userId}
          championshipSeries={championshipSeries}
          initialDesignation={panels.designation}
          initialSeason={panels.season}
          initialUserPlayer={panels.userPlayer}
        />
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
        <BadgeGallery
          userId={userId}
          championshipSeries={championshipSeries}
          initialBadges={panels.seasonBadges}
          initialSeason={panels.season}
        />
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
        <EnvironmentBadgeGallery
          userId={userId}
          initialBadges={panels.environmentBadges}
        />
      </section>
    ),
  });

  // 戦績分析
  sections.push({
    id: "stats",
    label: "戦績分析",
    node: (
      <section key="stats" className="flex flex-col gap-2">
        <UserStatPanel
          sectionTitle="戦績分析"
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          standardRegulations={standardRegulations}
          championshipSeries={championshipSeries}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
          initialStat={panels.stat}
          initialStatEnvironmentId={panels.statEnvironmentId}
          initialExcludeDefaultMatches={panels.excludeDefaultMatches}
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
        <UserStatHistoryChart
          userId={userId}
          championshipSeries={championshipSeries}
          initialExcludeDefaultMatches={panels.excludeDefaultMatches}
        />
      </section>
    ),
  });

  // デッキ使用率分析
  sections.push({
    id: "deck_usage",
    label: "デッキ使用率分析",
    node: (
      <section key="deck_usage" className="flex flex-col gap-2">
        <DeckUsagePanel
          sectionTitle="デッキ使用率分析"
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

  // 対戦相手のデッキ分析
  sections.push({
    id: "opponent_deck_usage",
    label: "対戦相手のデッキ分析",
    node: (
      <section key="opponent_deck_usage" className="flex flex-col gap-2">
        <OpponentDeckUsagePanel
          sectionTitle="対戦相手のデッキ分析"
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

  // 対戦環境分析（プラットフォーム全体の週次デッキ使用率・β機能）。
  // 記録3件未満のユーザーは組み合わせパネルをプロフィール直下(pinned)に出すため、
  // ここではセクションを積まない(ランキングの二重表示を避ける)。
  // 3件以上は組み合わせパネルをこの位置に、フラグ無効・件数不明時は従来パネルをフォールバック表示。
  if (!combinedAtTop) {
    sections.push({
      id: "environment_meta",
      label: "対戦環境データ",
      // 中身が組み合わせパネルと従来パネルで入れ替わるので、骨格もそれぞれに合わせる
      skeletonId: combinedAtSection ? "environment_meta_window" : "environment_meta",
      node: (
        <section key="environment_meta" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-default-700">対戦環境データ</h2>
            {/* 「詳しく見る」(→/deck_meta)は従来パネルのフォールバック表示時のみ。
                組み合わせパネル(3件以上)では不要なため出さない。 */}
            {!combinedAtSection && (
              <LinkButton
                href="/deck_meta"
                size="sm"
                variant="light"
                color="primary"
                radius="full"
                className="text-xs font-bold h-7 px-3"
              >
                詳しく見る
              </LinkButton>
            )}
          </div>
          {/* この節は初期表示では画面外。近づくまでマウントせず、取得(週次使用率・自分のデッキ)を
              ハイドレーション直後に走らせない(DeferUntilVisible 参照) */}
          {combinedAtSection ? (
            /* 見出し(「対戦環境データ」)はここで描画しているため、環境データが無い週でも
               カードを消さず空状態を出させる(showEmptyState)。消すと見出しだけが残る。 */
            <DeferUntilVisible fallback={<EnvironmentWindowCardSkeleton />}>
              <EnvironmentWindowCard
                userId={userId}
                totalRecords={totalRecords ?? 0}
                cohortWeek={cohort.cohortWeek}
                daysSinceSignup={cohort.daysSinceSignup}
                showEmptyState
              />
            </DeferUntilVisible>
          ) : (
            <DeferUntilVisible fallback={<WeeklyDeckUsagePanelSkeleton />}>
              <WeeklyDeckUsagePanel limit={5} />
            </DeferUntilVisible>
          )}
        </section>
      ),
    });
  }

  // 活動ログのカレンダー
  sections.push({
    id: "calendar",
    label: "活動ログのカレンダー",
    node: (
      <section key="calendar" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">活動ログのカレンダー</h2>
        {/* 画面外。近づくまでマウントしない(DeferUntilVisible 参照) */}
        <DeferUntilVisible fallback={<DashboardCalendarSkeleton />}>
          <DashboardCalendar userId={userId} />
        </DeferUntilVisible>
      </section>
    ),
  });

  /*
   * pinned に並べたカードのID。次回のホームの骨格を同じ構成で出すため、
   * DashboardSections が実際に描いた並びとして cookie に残す(utils/dashboardLayout)。
   * 下の pinned の中身と順序を揃えること。
   */
  const pinnedIds: DashboardBlockId[] = user
    ? [
        "profile",
        ...(showFirstRecordCta ? (["first_record_cta"] as const) : []),
        ...(combinedAtTop ? (["env_window"] as const) : []),
      ]
    : [];

  const recentRecords = (
    <section key="recent-records" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-default-700">最近の記録</h2>
        <LinkButton
          href="/records"
          size="sm"
          variant="light"
          color="primary"
          radius="full"
          className="text-xs font-bold h-7 px-3"
        >
          すべて見る
        </LinkButton>
      </div>
      {/* ページ末尾。近づくまでマウントせず、記録とその周辺情報の取得を初期表示から外す。
          骨格の外枠は Records の一覧グリッド(desktopColumns=3)と同じ指定にする */}
      <DeferUntilVisible
        fallback={
          <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2 xl:grid-cols-3 lg:gap-x-6">
            <RecordCardSkeletons
              desktopColumns={3}
              count={DASHBOARD_RECENT_RECORDS_LIMIT}
            />
          </div>
        }
      >
        <Records
          event_type="all"
          disable_more_load={true}
          limit={DASHBOARD_RECENT_RECORDS_LIMIT}
          desktopColumns={3}
        />
      </DeferUntilVisible>
    </section>
  );

  return (
    <>
      <div className="pt-3 lg:pt-9 xl:pt-9 max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full">
        <DashboardSections
          userId={userId}
          initialBadges={panels.badges}
          pinnedIds={pinnedIds}
          trailingId="recent_records"
          initialSectionLayout={
            storedLayout ? splitDashboardLayout(storedLayout).sections : undefined
          }
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
                  initialStat={panels.monthlyStat}
                  initialYearMonth={panels.yearMonth}
                  initialExcludeDefaultMatches={panels.excludeDefaultMatches}
                  initialStatsVisible={statsVisible}
                  initialUserPlayer={panels.userPlayer}
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
                {/*
                  組み合わせパネル(環境ウィンドウ E-2 ＋ 対戦環境分析): 記録3件未満のユーザーには
                  プロフィールカードの直後(CTA 0-6 の直後)に固定で並べ、価値を前倒しで見せる。
                  3件以上のユーザーには pinned では出さず「対戦環境分析」セクション位置に出す。
                */}
                {combinedAtTop && (
                  <EnvironmentWindowCard
                    userId={userId}
                    totalRecords={totalRecords ?? 0}
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

      {/*
        記録0件のユーザーには、ホームを開いた直後にクイックスタートを前に出す。
        プロフィールカードの取得結果(user)に依存しない導線なので、pinned の外に置く。
      */}
      {showQuickStartModal && (
        <QuickStartModal
          cohortWeek={cohort.cohortWeek}
          daysSinceSignup={cohort.daysSinceSignup}
        />
      )}

      <Footer />
    </>
  );
}
