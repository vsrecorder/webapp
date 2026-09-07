"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/react";

import { LuCirclePlus, LuTrophy, LuCalendar } from "react-icons/lu";

import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";
import { CityleagueResultSkeletons } from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultSkeleton";
import CityleagueScheduleHeaderSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueScheduleHeaderSkeleton";

import {
  CityleagueResultGetResponseType,
  CityleagueResultType,
} from "@app/types/cityleague_result";
import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import {
  OfficialEventListItemType,
  OfficialEventResponseType,
} from "@app/types/official_event";
import { buildSearchDates, shiftDateString } from "@app/utils/cityleagueListPage";
import {
  CityleagueListInitialData,
  CityleagueScheduleContext,
} from "@app/utils/cityleagueListServer";
import { toJSTDateString, todayJSTDateString } from "@app/utils/date";

async function fetchCityleagueResultsByTerm(
  league_type: number,
  from_date: string,
  to_date: string,
) {
  try {
    const res = await fetch(
      `/api/cityleague_results?league_type=${league_type}&from_date=${from_date}&to_date=${to_date}`,
      {
        cache: "no-store",
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: CityleagueResultGetResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

/*
 * タブを切り替えて別のリーグ区分を初めて開いたとき、league_type によらない同じ
 * スケジュールAPIをそれぞれが叩く。進行中の Promise をモジュールスコープで共有して
 * 1本にまとめる。完了したら消すので、マウントのたびに取り直す従来の鮮度は変わらない。
 */
const inflightScheduleFetches = new Map<string, Promise<unknown>>();

function dedupeInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = inflightScheduleFetches.get(key);
  if (hit) return hit as Promise<T>;
  const p = fn().finally(() => inflightScheduleFetches.delete(key));
  inflightScheduleFetches.set(key, p);
  return p;
}

async function fetchScheduleByDate(date: string): Promise<CityleagueScheduleType | null> {
  const res = await fetch(`/api/cityleague_schedules?date=${date}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchAllSchedules(): Promise<CityleagueScheduleType[]> {
  const res = await fetch("/api/cityleague_schedules", {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}

// その日のシティリーグ(type_id=2)の公式イベント一覧。応答の要素は単品応答
// (/api/official_events/{id})の部分集合で、BFF が表示に使うフィールドだけへ絞っている。
// カードが使う項目(開催日・店舗名・都道府県・リーグ・対戦環境)は含まれるため、
// 一覧で配ったものと個別に取り直したものを同じ prop に流せる。
async function fetchOfficialEventsByDate(
  league_type: number,
  date: string,
): Promise<OfficialEventResponseType | null> {
  const res = await fetch(
    `/api/official_events?type_id=2&league_type=${league_type}&date=${date}`,
    {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );
  if (!res.ok) return null;
  return res.json();
}

type Props = {
  league_type: number;
  /*
   * サーバで取った1ページ目(cityleagueListServer)。
   *
   * 渡された場合はスケジュールも1ページ目も取りに行かない。ハイドレーション後に
   * 直列4段の往復をしていたぶん、最初のカードが出るまでが丸ごと縮む。
   * 渡されないタブ(切り替えて初めて開いたもの)と、サーバでの取得に失敗したときは
   * 従来どおり自分で取る。
   */
  initial?: CityleagueListInitialData | null;
  /*
   * サーバで取ったスケジュール(開催期間)。league_type によらず共通なので、
   * initial を持たないタブにも配る。これが渡っていればタブを切り替えて初めて開いても
   * スケジュールAPI(開催中の確認 → 空振りなら全件)の2往復が要らない。
   */
  scheduleContext?: CityleagueScheduleContext | null;
};

export default function CityleagueResults({
  league_type,
  initial,
  scheduleContext,
}: Props) {
  // JSTでの今日。マウント時に確定させる(描画のたびに取り直すと、
  // 開催中かどうかの判定が描画ごとに変わりうる)。
  const today = useMemo(() => todayJSTDateString(), []);

  const [items, setItems] = useState<CityleagueResultType[]>(initial?.results ?? []);
  // official_event_id → イベント情報。日単位の一覧APIでまとめて取得したものを
  // 各カード(CityleagueResult)へ配り、カードごとの個別フェッチ(N+1)を避ける
  const [events, setEvents] = useState<OfficialEventListItemType[]>(
    initial?.events ?? [],
  );
  // 配列から組み直すのは、サーバから渡ってくる値が JSON 化できる必要があるため
  const eventsById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );
  // 続きを読み込むときの起点となる暦日("YYYY-MM-DD")
  const [nextDate, setNextDate] = useState<string>(
    initial?.nextFromDate ?? scheduleContext?.startDate ?? today,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial ? initial.hasMore : true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(!!initial);

  // 個別ページから戻ってきたとき、対象カードまで自動スクロールするための状態
  const [pendingScrollId, setPendingScrollId] = useState<number | null>(null);
  const scrollToIdRef = useRef<number | null>(null);

  // スケジュール情報
  const [schedule, setSchedule] = useState<CityleagueScheduleType | null>(
    scheduleContext?.schedule ?? null,
  );
  const [isScheduleInitialized, setIsScheduleInitialized] = useState(!!scheduleContext);

  // スケジュールを確認して開始日を設定（サーバで取れていれば何もしない）
  useEffect(() => {
    if (scheduleContext) return;

    async function initSchedule() {
      // 今日のスケジュールを確認（開催中かどうか）
      let foundSchedule = await dedupeInflight(`by-date:${today}`, () =>
        fetchScheduleByDate(today),
      );

      if (!foundSchedule) {
        // 開催中でない場合、全スケジュールから直近のものを取得
        const allSchedules = await dedupeInflight("all", fetchAllSchedules);

        const pastSchedules = allSchedules
          .filter((s) => toJSTDateString(s.to_date) < today)
          .sort((a, b) =>
            toJSTDateString(a.to_date) < toJSTDateString(b.to_date) ? 1 : -1,
          );

        foundSchedule = pastSchedules[0] ?? null;
      }

      if (foundSchedule) {
        setSchedule(foundSchedule);
        setNextDate(toJSTDateString(foundSchedule.to_date));
      }

      setIsScheduleInitialized(true);
    }

    initSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !isScheduleInitialized) return;

    setIsLoading(true);

    try {
      const scheduleFromDate = schedule ? toJSTDateString(schedule.from_date) : null;

      // 結果が登録されている最初の日を探す。スケジュールの開始日より前は遡らない
      for (const date of buildSearchDates(nextDate, scheduleFromDate)) {
        const newItems = await fetchCityleagueResultsByTerm(league_type, date, date);

        if (newItems.count === 0) continue;

        /*
         * 同じ日の公式イベント一覧を1回で取得してから結果を出す。
         * 一覧に無いidが混ざっていても、カード側が従来どおり個別に取得する
         * フォールバックがあるので表示は壊れない。取得失敗時も同様。
         */
        const dayEvents = await fetchOfficialEventsByDate(league_type, date).catch(
          () => null,
        );
        if (dayEvents?.official_events) {
          setEvents((prev) => [...prev, ...dayEvents.official_events]);
        }

        setItems((prev) => [...prev, ...newItems.event_results]);
        setNextDate(shiftDateString(date, -1));

        return;
      }

      setHasMore(false);
      return;
    } catch (error) {
      console.error("Error loading items:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      if (!isInitialLoaded) {
        setIsInitialLoaded(true);
      }
    }
  }, [
    league_type,
    nextDate,
    isLoading,
    hasMore,
    isInitialLoaded,
    isScheduleInitialized,
    schedule,
  ]);

  useEffect(() => {
    if (!isScheduleInitialized || isInitialLoaded) return;
    loadMore();
  }, [isScheduleInitialized, isInitialLoaded, loadMore]);

  // 戻り遷移時に保存されたスクロール対象を、リーグ種別が一致する場合だけ受け取る
  useEffect(() => {
    const savedId = sessionStorage.getItem("cityleagueResultScrollToId");
    const savedLeagueType = sessionStorage.getItem("cityleagueResultScrollToLeagueType");
    if (savedId && savedLeagueType && Number(savedLeagueType) === league_type) {
      setPendingScrollId(Number(savedId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 対象カードが描画されるまで自動ロードし、見つかったらスクロール対象として確定する
  useEffect(() => {
    if (pendingScrollId === null) return;
    if (!isInitialLoaded || isLoading) return;

    const found = items.some((item) => item.official_event_id === pendingScrollId);
    if (found) {
      scrollToIdRef.current = pendingScrollId;
      setPendingScrollId(null);
      sessionStorage.removeItem("cityleagueResultScrollToId");
      sessionStorage.removeItem("cityleagueResultScrollToLeagueType");
    } else if (hasMore) {
      loadMore();
    } else {
      // 全件読み込んでも見つからなかった場合は諦める
      setPendingScrollId(null);
      sessionStorage.removeItem("cityleagueResultScrollToId");
      sessionStorage.removeItem("cityleagueResultScrollToLeagueType");
    }
  }, [pendingScrollId, isInitialLoaded, isLoading, items, hasMore, loadMore]);

  // 検索が終わった（pendingScrollId が null になった）後にスクロール実行
  useEffect(() => {
    if (pendingScrollId !== null) return;
    const id = scrollToIdRef.current;
    if (id === null) return;
    scrollToIdRef.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(`cityleague-result-${id}`);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
  }, [pendingScrollId]);

  // 「2026/09/07」。toJSTDate() の戻り値はUTCゲッターで読む前提のズラした値なので、
  // getFullYear() 等(端末のタイムゾーン基準)で読むとUTCより西の端末で前日にずれる。
  const formatDate = (date: Date | string) => toJSTDateString(date).replaceAll("-", "/");

  /*
   * 開催中かどうか。
   *
   * サーバで初期データを取れているときはその判定をそのまま使う。ブラウザ側で
   * 「今日」を取り直すと、日付が変わる瞬間にサーバと食い違ってハイドレーションがずれる。
   */
  const isOngoing = scheduleContext
    ? scheduleContext.isOngoing
    : schedule
      ? toJSTDateString(schedule.from_date) <= today &&
        today <= toJSTDateString(schedule.to_date)
      : false;

  return (
    <div className="flex flex-col items-center space-y-3 pb-3">
      {/* 対象カードを探している間はオーバーレイでスピナーを表示 */}
      {pendingScrollId !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ zIndex: 9999 }}
            className="fixed inset-0 flex items-center justify-center bg-background/80"
          >
            <Spinner size="lg" />
          </div>,
          document.body,
        )}
      {/* スケジュール情報ヘッダー */}
      {!isScheduleInitialized ? (
        <CityleagueScheduleHeaderSkeleton />
      ) : schedule ? (
        <div className="w-full rounded-2xl bg-violet-500/15 border border-violet-500/30 px-4 py-4 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            {isOngoing && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            )}
            <span className="text-[0.625rem] font-bold text-primary uppercase tracking-widest">
              {isOngoing ? "開催中" : "直近の結果"}
            </span>
          </div>
          <p className="text-sm font-bold text-default-800">{schedule.title}</p>
          <p className="text-xs text-default-400">
            {formatDate(schedule.from_date)} 〜 {formatDate(schedule.to_date)}
          </p>
        </div>
      ) : null}

      {/* 空状態 */}
      {isInitialLoaded && !isLoading && !hasMore && items.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-14 px-6 text-center">
          <div className="relative">
            <LuTrophy className="text-6xl text-default-200" />
            <LuCalendar className="text-2xl text-default-300 absolute -bottom-1 -right-2" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-bold text-sm text-default-600">
              直近のシティリーグ結果はありません
            </p>
            <p className="text-xs text-default-400 leading-relaxed max-w-xs">
              シティリーグは年に数回、特定の期間に集中して開催されます。
              現在は開催期間外か、まだ結果が登録されていない可能性があります。
            </p>
            <p className="text-xs text-default-300 mt-1">次のシーズン開幕をお楽しみに</p>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full gap-3">
        {items.map((event_result) => (
          <div
            key={event_result.official_event_id}
            id={`cityleague-result-${event_result.official_event_id}`}
          >
            <CityleagueResult
              event_result={event_result}
              official_event={eventsById.get(event_result.official_event_id)}
            />
          </div>
        ))}

        {/* ローディング表示 */}
        {!isInitialLoaded && <CityleagueResultSkeletons />}
        {isInitialLoaded && isLoading && <Spinner size="lg" className="pt-0" />}

        {isInitialLoaded && !isLoading && hasMore && (
          <div className="flex justify-center">
            <Button size="sm" radius="full" onPress={loadMore} className="w-48 max-w-full">
              <div className="flex items-center gap-1">
                <span className="text-xs">
                  <LuCirclePlus />
                </span>
                <span className="font-bold text-xs">更に読み込む</span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
