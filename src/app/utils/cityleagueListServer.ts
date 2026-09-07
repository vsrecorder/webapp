import { cache } from "react";

import {
  CityleagueResultGetResponseType,
  CityleagueResultType,
} from "@app/types/cityleague_result";
import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { OfficialEventListItemType } from "@app/types/official_event";
import { buildSearchDates, shiftDateString } from "@app/utils/cityleagueListPage";
import { LIST_REVALIDATE_SECONDS, getJson } from "@app/utils/coreApi";
import { todayJSTDateString, toJSTDateString } from "@app/utils/date";
import { getOfficialEventList } from "@app/utils/officialEventListServer";

/*
 * シティリーグ結果一覧(/cityleague_results)の1ページ目を、サーバ側で組み立てる。
 *
 * これまで一覧はブラウザ側だけで取っていた。マウント後に
 * スケジュール → (開催期間外ならスケジュール全件) → 結果 → その日の公式イベント
 * と**直列に4段**往復するため、本番相当の実測(モバイル・CPU4倍)では
 * ハイドレーション完了が 1.6 秒、最初のカードが出るのが 2.9 秒だった
 * (API 自体の合計は 380ms で、待ちの大半は往復の直列と JS の実行)。
 * 記録一覧・デッキ一覧・ダッシュボードと同じく、ここで取って HTML に載せる。
 *
 * 一覧の中身は利用者によらず全員同じなので、上流の取得は Data Cache に載る
 * (getJson / getOfficialEventList はどちらも force-cache + 5分)。同じ時間帯に
 * 見る人が増えても上流への往復は増えない。
 *
 * 取得に失敗したら null を返す。ページはこれまでどおりブラウザ側が取り直すので、
 * 一覧が出なくなることはない(遅くなるだけ)。
 */

/*
 * リーグ区分(オープン/シニア/ジュニア)によらない、一覧共通の状況。
 *
 * スケジュールは league_type で変わらないので、タブを切り替えて初めて開いたときに
 * 取り直す必要が無い。1タブぶんの初期データしか無くても、これは全タブへ配る。
 */
export type CityleagueScheduleContext = {
  // 表示中のスケジュール(開催期間)。該当が無ければ null
  schedule: CityleagueScheduleType | null;
  /*
   * 開催期間中か。
   *
   * 「今日」の判定をサーバとブラウザの両方で行うと、日付が変わる瞬間に食い違って
   * ハイドレーションがずれる。サーバで判定した結果をそのまま使う。
   */
  isOngoing: boolean;
  // 結果を遡り始める暦日("YYYY-MM-DD")。スケジュールの最終日、引けなければ今日
  startDate: string;
};

export type CityleagueListInitialData = CityleagueScheduleContext & {
  // 1ページ目(結果が登録されている直近1日ぶん)
  results: CityleagueResultType[];
  /*
   * その日の公式イベント。カードが店舗名・都道府県・リーグ区分に使う。
   *
   * Map ではなく配列で持つのは、サーバコンポーネントからクライアントへ渡す値は
   * JSON 化できる必要があるため(受け取った側で Map に組み直す)。
   */
  events: OfficialEventListItemType[];
  // 続きを読むときの起点("YYYY-MM-DD")。1ページ目に採用した日の前日
  nextFromDate: string;
  hasMore: boolean;
};

// 開催中のスケジュール。無ければ、既に終わったもののうち最も新しいもの
async function getCurrentOrLatestSchedule(
  today: string,
): Promise<CityleagueScheduleType | null> {
  const ongoing = await getJson<CityleagueScheduleType>(
    `/api/v1beta/cityleague_schedules?date=${today}`,
    LIST_REVALIDATE_SECONDS,
  );

  if (ongoing?.id) return ongoing;

  const all = await getJson<CityleagueScheduleType[]>(
    `/api/v1beta/cityleague_schedules`,
    LIST_REVALIDATE_SECONDS,
  );

  const past = (all ?? [])
    .filter((schedule) => toJSTDateString(schedule.to_date) < today)
    .sort((a, b) => (toJSTDateString(a.to_date) < toJSTDateString(b.to_date) ? 1 : -1));

  return past[0] ?? null;
}

async function getResultsByDate(
  leagueType: number,
  date: string,
): Promise<CityleagueResultType[]> {
  const ret = await getJson<CityleagueResultGetResponseType>(
    `/api/v1beta/cityleague_results?league_type=${leagueType}&from_date=${date}&to_date=${date}`,
    LIST_REVALIDATE_SECONDS,
  );

  return ret?.count ? ret.event_results : [];
}

export const getCityleagueListInitialData = cache(
  async function getCityleagueListInitialData(
    leagueType: number,
  ): Promise<CityleagueListInitialData | null> {
    try {
      const today = todayJSTDateString();
      const schedule = await getCurrentOrLatestSchedule(today);

      const scheduleFromDate = schedule ? toJSTDateString(schedule.from_date) : null;
      const isOngoing = schedule
        ? scheduleFromDate! <= today && today <= toJSTDateString(schedule.to_date)
        : false;

      // 起点はスケジュールの最終日。スケジュールが引けなかったときは今日から遡る
      // (ブラウザ側の従来の挙動と同じ)
      const startDate = schedule ? toJSTDateString(schedule.to_date) : today;

      /*
       * 結果が登録されている最初の日を探す。
       *
       * 並列に14日ぶん投げると上流への往復が常に14本になる。ここは1日目で当たることが
       * ほとんど(スケジュールの最終日は開催日)で、外れても上流は p50 15ms なので、
       * 素直に近い日から順に見る。
       */
      for (const date of buildSearchDates(startDate, scheduleFromDate)) {
        const results = await getResultsByDate(leagueType, date);

        if (results.length === 0) continue;

        // カードが使う店舗名などは日単位の一覧でまとめて取る(カードごとの取得を避ける)。
        // 取れなくてもカード側に個別取得のフォールバックがあるので、結果は返す
        const events = await getOfficialEventList("2", String(leagueType), date)
          .then((res) => res.official_events ?? [])
          .catch(() => []);

        return {
          schedule,
          isOngoing,
          startDate,
          results,
          events,
          nextFromDate: shiftDateString(date, -1),
          hasMore: true,
        };
      }

      // 遡り切っても結果が無い = このシーズンにはもう出すものが無い
      return {
        schedule,
        isOngoing,
        startDate,
        results: [],
        events: [],
        nextFromDate: startDate,
        hasMore: false,
      };
    } catch (error) {
      console.error("failed to build the cityleague results initial data", error);

      return null;
    }
  },
);
