"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import {
  OfficialEventListItemType,
  OfficialEventResponseType,
} from "@app/types/official_event";
import {
  buildSearchDates,
  resolveSearchStartDate,
  shiftDateString,
} from "@app/utils/cityleagueListPage";
import {
  CityleagueListInitialData,
  CityleagueScheduleContext,
} from "@app/utils/cityleagueListServer";
import {
  isHeadRefreshDue,
  mergeHeadResults,
  pickLatestDay,
  planHeadRefresh,
} from "@app/utils/cityleagueListRefresh";
import { toJSTDateString, todayJSTDateString } from "@app/utils/date";
import { collectListedDeckCodes } from "@app/utils/deckArchetype";
import { fetchDeckArchetypes } from "@app/utils/deckArchetypeClient";
import {
  CITYLEAGUE_SCROLL_TO_ID_KEY,
  CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY,
  clearCityleagueResultScrollTarget,
} from "@app/utils/cityleagueScrollRestore";
import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import { applyWithScrollCompensation, forceRepaint } from "@app/utils/scrollRepaint";
import FetchError from "@app/components/molecules/FetchError";

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

    // 200 でも想定と違う形(エラーメッセージだけの JSON など)が返ることがある。
    // そのまま配列として展開するとページごとエラー画面へ落ちるので、ここで均しておく
    const event_results = Array.isArray(ret?.event_results) ? ret.event_results : [];

    return {
      ...ret,
      event_results,
      count: typeof ret?.count === "number" ? ret.count : event_results.length,
    };
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

  const data = await res.json();
  // 想定と違う形なら「該当なし」として扱う(開催期間の読み取りで落ちない)
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
}

async function fetchAllSchedules(): Promise<CityleagueScheduleType[]> {
  const res = await fetch("/api/cityleague_schedules", {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data) ? data : [];
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

  const data: OfficialEventResponseType = await res.json();

  return {
    ...data,
    official_events: Array.isArray(data?.official_events) ? data.official_events : [],
  };
}

/*
 * 上端を取り直したぶんを差し込むときに、画面上の位置を保つ基準にするカード。
 * 差し込み後も残るカードのうち、画面に掛かっている最初のもの。
 *
 * ページの最上部にいるときは基準を持たない(null)。新しい結果が上に現れるのを見せたいので、
 * 位置を保たずにそのまま差し込む(Chrome のスクロールアンカリングも最上部では効かない)。
 */
function findAnchorCard(
  list: HTMLElement | null,
  keepIds: ReadonlySet<number>,
): HTMLElement | null {
  if (!list || window.scrollY < 1) return null;

  for (const el of Array.from(list.children)) {
    if (!(el instanceof HTMLElement)) continue;
    const id = Number(el.dataset.officialEventId);
    if (!keepIds.has(id)) continue;
    if (el.getBoundingClientRect().bottom > 0) return el;
  }

  return null;
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
  /*
   * 選択中のタブか。一覧のテンプレートは選ばれていないタブも hidden で残すので、
   * 見えていないものはアプリへの復帰時に取り直さない。選び直されたときに取り直す。
   */
  isActive?: boolean;
};

export default function CityleagueResults({
  league_type,
  initial,
  scheduleContext,
  isActive = true,
}: Props) {
  // JSTでの今日。マウント時に確定させる(描画のたびに取り直すと、
  // 開催中かどうかの判定が描画ごとに変わりうる)。useMemo は値の保持を保証しない
  // (React はメモを捨てて計算し直せる)ので state で持つ
  const [today] = useState(() => todayJSTDateString());

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
  // デッキコード → 種類(バトラボのデッキ分類)。1 日ぶんずつまとめて取り、各カードへ配る
  const [deckArchetypes, setDeckArchetypes] = useState<DeckArchetypeMap>(
    initial?.deckArchetypes ?? {},
  );
  // 続きを読み込むときの起点となる暦日("YYYY-MM-DD")
  const [nextDate, setNextDate] = useState<string>(
    initial?.nextFromDate ?? scheduleContext?.startDate ?? today,
  );
  const [hasMore, setHasMore] = useState(initial ? initial.hasMore : true);
  // 取得に失敗したか。結果が無いのか取れなかったのかを区別して伝える
  const [isError, setIsError] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(!!initial);
  // 「更に読み込む」を押して、続きを待っている間
  const [manualLoadPending, setManualLoadPending] = useState(false);

  /*
   * 一覧の上端(新しい側)を取り直す要求。
   *
   * サーバで取った1ページ目は、個別ページから「戻る」とルーターのキャッシュにある当時の描画が
   * そのまま使われ、アプリを開いたまま時間を置いて戻ってきても描き直されない。結果は1日の中でも
   * 順に登録されていくため、再読み込みするまで最新が出なかった。記録一覧・デッキ一覧と同じく
   * マウント直後に取り直し、加えてアプリへの復帰時とタブを選び直したときにも取り直す
   * (間引きは isHeadRefreshDue)。取り直しは読み込み済みのぶんを残したまま上に差し込む。
   */
  const [refreshRequested, setRefreshRequested] = useState(!!initial);
  // 最後に上端をそろえた時刻。サーバで取った1ページ目のままなら null(まだそろえていない)
  const lastSyncedAtRef = useRef<number | null>(null);
  // 一覧の描画範囲。差し込むときに位置を保つ基準のカードを探す
  const listRef = useRef<HTMLDivElement>(null);

  // タブを選び直したとき。隠れている間はアプリへの復帰を拾っていないので取り直す
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (prevIsActive !== isActive) {
    setPrevIsActive(isActive);
    if (isActive) setRefreshRequested(true);
  }

  // アプリ(ブラウザのタブ)へ戻ってきたとき。ページごと戻る bfcache からの復帰も含める
  useEffect(() => {
    if (!isActive) return;

    const request = () => setRefreshRequested(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) request();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [isActive]);

  // 取り直しは最初の読み込みが済んでから。その間は続きの読み込みを止める(同じ一覧を同時に触らない)
  const isRefreshing = refreshRequested && isInitialLoaded;

  /*
   * 個別ページから戻ってきたとき、対象カードまで自動スクロールするための対象。
   * sessionStorage のフラグを「外部ストア」として描画中に読み(useSessionStorageItem)、
   * リーグ種別が一致する場合だけ受け取る。見つかったら/諦めたら消し、その場で追随する
   */
  /*
   * 受け取るのは、この一覧が現れた時点で既に書かれていた対象だけ(useReturnTargetItem)。
   * 対象はカードから個別ページへ進む直前に書かれるので、素直に購読すると遷移が終わるまで
   * 残っている「この」一覧が受け取ってその場で消し、戻ってきた一覧には何も残らなかった。
   */
  const savedScrollId = useReturnTargetItem(CITYLEAGUE_SCROLL_TO_ID_KEY);
  const savedScrollLeagueType = useReturnTargetItem(CITYLEAGUE_SCROLL_TO_LEAGUE_TYPE_KEY);
  const pendingScrollId =
    savedScrollId && savedScrollLeagueType && Number(savedScrollLeagueType) === league_type
      ? Number(savedScrollId)
      : null;
  const scrollTargetFound =
    pendingScrollId !== null && items.some((item) => item.official_event_id === pendingScrollId);
  // 対象カードが描画されるまで自動で続きを読む
  const autoLoadPending = pendingScrollId !== null && !scrollTargetFound && hasMore;

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
        // 開催中のシーズンは今日から遡る(最終日からだと今日まで届かない。resolveSearchStartDate 参照)
        setNextDate(resolveSearchStartDate(toJSTDateString(foundSchedule.to_date), today));
      }

      setIsScheduleInitialized(true);
    }

    initSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * 続きを読み込んでいる最中か。読み込みの「要求」は state ではなく条件から導く:
   * 初回の読み込み・対象カードを探すための自動読み込み・「更に読み込む」の押下のいずれかで、
   * 読める続きがある(hasMore)間。下の effect はこれが立っている間、続きを取って一覧に足す。
   * 足し終えると(nextDate が進むので)条件を見直し、まだ立っていれば次の続きを取る
   */
  const isLoading =
    isScheduleInitialized &&
    !isRefreshing &&
    hasMore &&
    (!isInitialLoaded || autoLoadPending || manualLoadPending);

  useEffect(() => {
    if (!isLoading) return;

    let cancelled = false;
    (async () => {
      try {
        const scheduleFromDate = schedule ? toJSTDateString(schedule.from_date) : null;

        // 結果が登録されている最初の日を探す。スケジュールの開始日より前は遡らない
        for (const date of buildSearchDates(nextDate, scheduleFromDate)) {
          const newItems = await fetchCityleagueResultsByTerm(league_type, date, date);
          if (cancelled) return;

          if (newItems.count === 0) continue;

          /*
           * 同じ日の公式イベント一覧を1回で取得してから結果を出す。
           * 一覧に無いidが混ざっていても、カード側が従来どおり個別に取得する
           * フォールバックがあるので表示は壊れない。取得失敗時も同様。
           *
           * デッキの種類(バトラボ)も同時に引く。結果を出してから後で足すと、
           * 種類の行が後から現れてカードが伸びる(Swiper の高さも動く)ので、揃ってから出す。
           */
          const [dayEvents, dayArchetypes] = await Promise.all([
            fetchOfficialEventsByDate(league_type, date).catch(() => null),
            fetchDeckArchetypes(collectListedDeckCodes(newItems.event_results)),
          ]);
          if (cancelled) return;

          if (dayEvents?.official_events.length) {
            setEvents((prev) => [...prev, ...dayEvents.official_events]);
          }

          if (Object.keys(dayArchetypes).length > 0) {
            setDeckArchetypes((prev) => ({ ...prev, ...dayArchetypes }));
          }

          setItems((prev) => [...prev, ...newItems.event_results]);
          setNextDate(shiftDateString(date, -1));
          setIsError(false);
          // 1ページ目を自分で取ったときは、それが最新。直後に取り直さない
          if (!isInitialLoaded) lastSyncedAtRef.current = Date.now();

          return;
        }

        setHasMore(false);
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading items:", error);
        // 取得できなかっただけで、結果が無いとは限らない。
        // 「直近のシティリーグ結果はありません」と取り違えられないよう区別する
        setIsError(true);
        setHasMore(false);
      } finally {
        if (!cancelled) {
          setIsInitialLoaded(true);
          setManualLoadPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, nextDate, league_type, schedule, isInitialLoaded]);

  useEffect(() => {
    if (!isRefreshing) return;

    let cancelled = false;
    (async () => {
      try {
        if (!isHeadRefreshDue(lastSyncedAtRef.current)) return;

        // 「今日」は取り直すたびに取り直す(開いたまま日付をまたいで戻ってくることがある)
        const scheduleFromDate = schedule ? toJSTDateString(schedule.from_date) : null;
        const toDate = resolveSearchStartDate(
          schedule ? toJSTDateString(schedule.to_date) : null,
          todayJSTDateString(),
        );
        const plan = planHeadRefresh(
          items.length > 0 ? toJSTDateString(items[0].date) : null,
          toDate,
          scheduleFromDate,
        );

        if (plan) {
          const fetched = await fetchCityleagueResultsByTerm(
            league_type,
            plan.fromDate,
            plan.toDate,
          );
          if (cancelled) return;

          const latest = plan.mode === "reset" ? pickLatestDay(fetched.event_results) : null;
          const nextItems =
            plan.mode === "merge"
              ? mergeHeadResults(items, fetched.event_results, plan.fromDate)
              : latest?.results ?? null;

          if (nextItems) {
            // 新しく出るカードの店舗名など(日単位)とデッキの種類を、出す前にそろえる(初回の読み込みと同じ)
            const added = nextItems.filter((item) => !eventsById.has(item.official_event_id));
            const addedDates = [...new Set(added.map((item) => toJSTDateString(item.date)))];
            const [dayEvents, addedArchetypes] = await Promise.all([
              Promise.all(
                addedDates.map((date) =>
                  fetchOfficialEventsByDate(league_type, date).catch(() => null),
                ),
              ),
              fetchDeckArchetypes(collectListedDeckCodes(added)),
            ]);
            if (cancelled) return;

            const newEvents = dayEvents
              .flatMap((res) => res?.official_events ?? [])
              .filter((event) => !eventsById.has(event.id));

            // 差し込み(merge)は見ている位置を保つ。出し直し(reset)は元のカードが残らないので保たない
            const anchor =
              plan.mode === "merge"
                ? findAnchorCard(
                    listRef.current,
                    new Set(nextItems.map((item) => item.official_event_id)),
                  )
                : null;

            /*
             * 反映は flushSync で同期的に描かれ、items が変わるのでこの effect が掛け直される。
             * その前にそろえた時刻と要求の取り下げを済ませ、掛け直しで同じ取り直しが走らないようにする
             */
            lastSyncedAtRef.current = Date.now();
            applyWithScrollCompensation(anchor, () => {
              setRefreshRequested(false);
              if (newEvents.length > 0) setEvents((prev) => [...prev, ...newEvents]);
              if (Object.keys(addedArchetypes).length > 0) {
                setDeckArchetypes((prev) => ({ ...prev, ...addedArchetypes }));
              }
              setItems(nextItems);
              if (latest) {
                setNextDate(latest.nextFromDate);
                setHasMore(true);
                setIsError(false);
              }
            });
            // 位置を戻しただけでは iOS が描き直さないことがある(scrollRepaint 参照)
            if (anchor) forceRepaint(listRef.current);
          }
        }

        lastSyncedAtRef.current = Date.now();
      } catch (error) {
        // 取り直せなくても、出ている一覧はそのまま残す
        console.error("Error refreshing items:", error);
      } finally {
        if (!cancelled) setRefreshRequested(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRefreshing, items, eventsById, league_type, schedule]);

  // 失敗したぶんを取り直す。打ち切っていた続きの読み込みを再開する
  const retryLoad = () => {
    setIsError(false);
    setHasMore(true);
    setManualLoadPending(true);
  };

  // 「更に読み込む」。読み込み中・続きが無いときは何もしない
  const loadMore = () => {
    if (isLoading || !hasMore || !isScheduleInitialized) return;
    setManualLoadPending(true);
  };

  // 対象カードが見つかったら、スクロール対象を消して(覆いが外れる)その位置までスクロールする。
  // このカードは描画済み(items にある)なので、フレームを1つ待ってから測る
  // 取り直しで上にカードが差し込まれると位置がずれるので、取り直しが済んでから測る
  useEffect(() => {
    if (pendingScrollId === null || !scrollTargetFound || isRefreshing) return;

    clearCityleagueResultScrollTarget();

    const id = pendingScrollId;
    requestAnimationFrame(() => {
      const el = document.getElementById(`cityleague-result-${id}`);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
  }, [pendingScrollId, scrollTargetFound, isRefreshing]);

  // 全件読み込んでも見つからなかった場合は諦める(対象を消して覆いを外す)
  useEffect(() => {
    if (pendingScrollId === null || scrollTargetFound) return;
    if (!isInitialLoaded || isRefreshing || hasMore) return;

    clearCityleagueResultScrollTarget();
  }, [pendingScrollId, scrollTargetFound, isInitialLoaded, isRefreshing, hasMore]);

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
        /* 「開催中」を 1 行目に独立させ、シーズン名を 2 行目、期間を 3 行目に置く。
           行の高さ(16/20/16)と gap-0.5 を決め打ちにして
           2(border) + 16(py-2) + 16 + 2 + 20 + 2 + 16 = 74px に固定する(実測で一致)。
           mt-2 は、すぐ上の固定バー(CityleagueBrowseBar)にくっついて見えないための余白。
           骨格(CityleagueScheduleHeaderSkeleton)と同じ寸法なので、変えるときは両方直すこと */
        <div className="mt-2 w-full rounded-2xl bg-violet-500/15 border border-violet-500/30 px-4 py-2 flex flex-col items-center gap-0.5">
          <span className="flex h-4 shrink-0 items-center gap-1">
            {isOngoing && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            )}
            <span className="text-[0.625rem] font-bold text-primary uppercase tracking-widest">
              {isOngoing ? "開催中" : "直近の結果"}
            </span>
          </span>
          <p className="h-5 min-w-0 max-w-full truncate text-sm font-bold leading-5 text-default-800">
            {schedule.title}
          </p>
          <p className="h-4 text-xs leading-4 text-default-400">
            {formatDate(schedule.from_date)} 〜 {formatDate(schedule.to_date)}
          </p>
        </div>
      ) : null}

      {/* 空状態。開催中なら「結果の登録待ち」、開催期間外なら「次のシーズン待ち」を伝える
          (開催初日は大会が終わるまで結果が無いので、期間外の文言だと食い違う) */}
      {isInitialLoaded && !isLoading && !hasMore && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-14 px-6 text-center">
          <div className="relative">
            <LuTrophy className="text-6xl text-default-200" />
            <LuCalendar className="text-2xl text-default-300 absolute -bottom-1 -right-2" />
          </div>
          {isOngoing ? (
            <div className="flex flex-col gap-2">
              <p className="font-bold text-sm text-default-600">
                シティリーグの結果はまだありません
              </p>
              <p className="text-xs text-default-400 leading-relaxed max-w-xs">
                現在シティリーグが開催中です。
                <br />
                大会の結果は、登録され次第ここに表示されます。
              </p>
              <p className="text-xs text-default-300 mt-1">結果の登録をお待ちください</p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      <div ref={listRef} className="flex flex-col w-full gap-3">
        {items.map((event_result) => (
          <div
            key={event_result.official_event_id}
            id={`cityleague-result-${event_result.official_event_id}`}
            data-official-event-id={event_result.official_event_id}
          >
            <CityleagueResult
              event_result={event_result}
              official_event={eventsById.get(event_result.official_event_id)}
              deck_archetypes={deckArchetypes}
            />
          </div>
        ))}

        {/* 取得できなかったとき。読み込み済みのぶんは残したまま、その先だけ取り直せるようにする */}
        {isInitialLoaded && !isLoading && isError && (
          <FetchError
            message="シティリーグ結果を取得できませんでした"
            onRetry={retryLoad}
            compact={items.length > 0}
          />
        )}

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
