"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardBody, Spinner } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";
import LinkButton from "@app/components/molecules/LinkButton";
import RecapPeriodTile, {
  gridTileColorIndex,
} from "@app/components/organisms/Report/RecapPeriodTile";

import { EnvironmentType } from "@app/types/environment";
import { UserStatType } from "@app/types/user_stat";
import { OldestRecordEventDateType } from "@app/types/oldest_record_event_date";
import { UserStatHistoryType, UserStatMonthlyType } from "@app/types/user_stat_history";

import { environmentBadgeImageUrl } from "@app/utils/badgeImage";
import { selectableEnvironments } from "@app/utils/recapPeriod";
import { lastWeekValue, weekRangeLabel } from "@app/utils/week";
import { currentYearMonth, daysInMonth, yearMonthLabel } from "@app/utils/yearMonth";

// 月・環境それぞれの表示上限。古い期間まで無制限に並べても選ぶ意味がないため区切る。
const MAX_TILES_PER_KIND = 6;

type Props = {
  userId: string;
};

// 環境ごとの戦績。記録がある環境だけをタイルに出すために引く
type EnvironmentStat = {
  environment: EnvironmentType;
  stat: UserStatType;
};

// 月と環境を1つの並びに混ぜるため、表示に必要なものだけの形に正規化する。
type TimelineItem = {
  key: string;
  href: string;
  kindLabel: string;
  title: string;
  // 環境のときだけ入る、名前の次の行に置く語
  titleSuffix?: string;
  subtitle: string;
  // 環境のときだけ入る拡張パックの画像URL
  badgeImageUrl?: string;
  // 環境は2列ぶんの横長で置く（正方形だけが並ぶ単調さを崩す）
  isWide?: boolean;
  // 並び替えの基準。月はその月の末日、環境は終了日
  sortAt: number;
};

/*
 * バトルレポートの入口（/users/report）。
 *
 * 期間はセレクタで選ばせず、開ける期間そのものをタイルとして並べる。
 * 月と環境は種類で分けず、新しい順の1本の並びにする（環境は終了日を基準にする）。
 * 並ぶのは記録がある月と、記録を始めてから終わった環境だけで、
 * 全期間を機械的に並べることはしない。
 */
export default function TemplateUserReportIndex({ userId }: Props) {
  const [history, setHistory] = useState<UserStatMonthlyType[]>([]);
  const [environmentStats, setEnvironmentStats] = useState<EnvironmentStat[]>([]);
  // 先週の戦績。先週に記録があるときだけ、グリッドの先頭に週次のタイルを出す
  const [lastWeekStat, setLastWeekStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      // 月次履歴は期間を決め打ちでしか引けない(3months/6months/season)。
      // 今月を hero に回すぶん 6ヶ月では6件に届かず、逆にシーズン開始直後は
      // シーズン側が数ヶ月しか無い。両方引いて和集合にすると、どちらの時期でも埋まる。
      // レギュレーションは絞らない（レポート本体の periodQuery と揃えている）。
      // ここを片方だけ絞るとタイルの戦数・勝率が開いたレポートと食い違う。
      const [seasonRes, recentRes, environmentsRes, oldestRes, lastWeekRes] =
        await Promise.all([
          fetch(`/api/users/${userId}/stat/history?period=season`, { cache: "no-store" }),
          fetch(`/api/users/${userId}/stat/history?period=6months`, { cache: "no-store" }),
          fetch(`/api/environments`, { cache: "no-store" }),
          fetch(`/api/users/${userId}/oldest-record-event-date`, { cache: "no-store" }),
          // 先週(月〜日)の戦績。週次レポート通知(P-2)の入口をここにも置く
          fetch(`/api/users/${userId}/stat?week=${lastWeekValue()}`, { cache: "no-store" }),
        ]);

      if (!seasonRes.ok && !recentRes.ok) {
        throw new Error("failed to fetch stat history");
      }

      const seasonData: UserStatHistoryType | null = seasonRes.ok
        ? await seasonRes.json()
        : null;
      const recentData: UserStatHistoryType | null = recentRes.ok
        ? await recentRes.json()
        : null;
      const allEnvironments: EnvironmentType[] = environmentsRes.ok
        ? await environmentsRes.json()
        : [];
      const oldest: OldestRecordEventDateType | null = oldestRes.ok
        ? await oldestRes.json()
        : null;

      // 先週の戦績が引けなくても他のタイルは出す
      setLastWeekStat(lastWeekRes.ok ? await lastWeekRes.json() : null);

      // 同じ月が両方に出るので年月をキーに畳む
      const byMonth = new Map<string, UserStatMonthlyType>();
      for (const row of [
        ...(seasonData?.history ?? []),
        ...(recentData?.history ?? []),
      ]) {
        byMonth.set(row.year_month, row);
      }

      setHistory([...byMonth.values()]);

      /*
       * 環境は「記録期間と重なるか」だけでは、その環境で1戦もしていない場合にも
       * タイルが出てしまう（開くと空のレポートになる）。候補を絞ったうえで
       * 環境ごとの戦績を引き、記録がある環境だけを残す。
       * 月のタイルと同じ「N戦・勝率」を出すためにも、この集計が要る。
       */
      const candidates = selectableEnvironments(
        allEnvironments,
        oldest?.event_date ?? null,
      ).slice(0, MAX_TILES_PER_KIND);

      const stats = await Promise.all(
        candidates.map(async (environment): Promise<EnvironmentStat | null> => {
          try {
            const res = await fetch(
              `/api/users/${userId}/stat?environment_id=${environment.id}`,
              { cache: "no-store" },
            );
            if (!res.ok) return null;
            return { environment, stat: await res.json() };
          } catch {
            // 1つ引けなくても他のタイルは出す
            return null;
          }
        }),
      );

      setEnvironmentStats(
        stats.filter(
          (entry): entry is EnvironmentStat =>
            entry !== null && entry.stat.total_matches > 0,
        ),
      );
    } catch (e) {
      console.error(e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const thisMonth = currentYearMonth();

  const thisMonthRow = useMemo(
    () => history.find((row) => row.year_month === thisMonth) ?? null,
    [history, thisMonth],
  );

  // 今月を除いた月と環境を、新しい順の1本の並びにする。
  // 月はその月の末日、環境は終了日を基準に並べる。
  const timeline = useMemo<TimelineItem[]>(() => {
    const months: TimelineItem[] = history
      .filter((row) => row.year_month !== thisMonth && row.total_matches > 0)
      .sort((a, b) => b.year_month.localeCompare(a.year_month))
      .slice(0, MAX_TILES_PER_KIND)
      .map((row) => {
        const [year, month] = row.year_month.split("-").map(Number);
        return {
          key: `month-${row.year_month}`,
          href: `/users/report/${row.year_month}`,
          kindLabel: "MONTHLY",
          title: yearMonthLabel(row.year_month),
          subtitle: `${row.total_matches}戦 ・ 勝率 ${(row.win_rate * 100).toFixed(1)}%`,
          sortAt: new Date(year, month - 1, daysInMonth(row.year_month)).getTime(),
        };
      });

    // 取得時に「記録がある環境」だけへ絞ってあるので、ここでは並べるだけ
    const envs: TimelineItem[] = environmentStats.map(({ environment, stat }) => ({
      key: `env-${environment.id}`,
      href: `/users/report/environments/${environment.id}`,
      kindLabel: "ENVIRONMENT",
      title: `『${environment.title}』`,
      titleSuffix: "環境",
      subtitle: `${stat.total_matches}戦 ・ 勝率 ${(stat.win_rate * 100).toFixed(1)}%`,
      badgeImageUrl: environmentBadgeImageUrl(environment.id),
      isWide: true,
      sortAt: new Date(environment.to_date).getTime(),
    }));

    return [...months, ...envs].sort((a, b) => b.sortAt - a.sortAt);
  }, [history, thisMonth, environmentStats]);

  // 画像を持つのは環境のタイルだけで、並びの先頭に来るその1枚が LCP になる。
  // 遅延読み込みのままだと表示が遅れるため、先頭の1枚だけ即時読み込みにする。
  const eagerImageKey = useMemo(
    () => timeline.find((item) => item.badgeImageUrl)?.key ?? null,
    [timeline],
  );

  // 先週に1戦以上あるときだけ出す（記録の無い週のタイルを開いても空になるだけのため）
  const lastWeek = lastWeekValue();
  const lastWeekTile =
    lastWeekStat && lastWeekStat.total_matches > 0 ? lastWeekStat : null;

  const hasAnything =
    (thisMonthRow?.total_matches ?? 0) > 0 || timeline.length > 0 || lastWeekTile !== null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-4 pb-6">

      {hasError ? (
        <Card className="shadow-md">
          <CardBody className="py-10">
            <FetchError message="バトルレポートを取得できませんでした" onRetry={load} />
          </CardBody>
        </Card>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24">
          <Spinner size="sm" />
          <span className="text-[11px] text-default-400">
            バトルレポートを集めています
          </span>
        </div>
      ) : (
        <>
          {/* 見出しと今月のタイルは1つの塊にする。
              見出しだけを素の文字で離して置くと、下のタイル群から浮いて見える。 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-black leading-none tracking-tight text-foreground">
                バトルレポート
              </h1>
              <p className="text-xs leading-relaxed text-default-400">
                週毎・月毎・環境毎の戦績を、画像にしてシェアできます
              </p>
            </div>

            {/* 今月は必ず先頭に大きく置く。記録が無くても入口は見せる */}
            <RecapPeriodTile
              variant="hero"
              href={`/users/report/${thisMonth}`}
              colorIndex={0}
              kindLabel="MONTHLY REPORT"
              title={yearMonthLabel(thisMonth)}
              subtitle={
                thisMonthRow && thisMonthRow.total_matches > 0
                  ? `${thisMonthRow.total_matches}戦 ・ 勝率 ${(thisMonthRow.win_rate * 100).toFixed(1)}%`
                  : "まだ記録がありません"
              }
            />
          </div>

          {(timeline.length > 0 || lastWeekTile) && (
            <div className="grid grid-cols-2 gap-3">
              {/* 先週は月や環境より新しいので、並びの先頭に横長で置く */}
              {lastWeekTile && (
                <RecapPeriodTile
                  href={`/users/report/weeks/${lastWeek}`}
                  variant="wide"
                  colorIndex={gridTileColorIndex(0)}
                  kindLabel="WEEKLY REPORT"
                  title={`${weekRangeLabel(lastWeek)}の週`}
                  subtitle={`先週 ・ ${lastWeekTile.total_matches}戦 ・ 勝率 ${(lastWeekTile.win_rate * 100).toFixed(1)}%`}
                />
              )}
              {timeline.map((item, index) => (
                <RecapPeriodTile
                  key={item.key}
                  href={item.href}
                  variant={item.isWide ? "wide" : "tile"}
                  // 先週のタイルがあるときは1つずらし、隣り合う面が同じ色にならないようにする
                  colorIndex={gridTileColorIndex(index + (lastWeekTile ? 1 : 0))}
                  kindLabel={item.kindLabel}
                  title={item.title}
                  titleSuffix={item.titleSuffix}
                  subtitle={item.subtitle}
                  badgeImageUrl={item.badgeImageUrl}
                  eagerImage={item.key === eagerImageKey}
                />
              ))}
            </div>
          )}

          {!hasAnything && (
            <Card className="shadow-md">
              <CardBody className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black text-foreground">
                    レポートにする記録がまだありません
                  </span>
                  <span className="text-[11px] leading-relaxed text-default-500">
                    勝敗と相手デッキだけなら10秒で残せます。1戦記録すると、その月の
                    レポートが作られます。
                  </span>
                </div>
                <LinkButton href="/records/quick" color="primary" className="w-full">
                  10秒で1戦を記録する
                </LinkButton>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
