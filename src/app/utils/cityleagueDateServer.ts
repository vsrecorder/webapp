import { cache } from "react";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventListItemType } from "@app/types/official_event";
import { getResultsByDate } from "@app/utils/cityleagueListServer";
import { getOfficialEventList } from "@app/utils/officialEventListServer";

/*
 * 開催日ページ(/cityleague_results/dates/[date])の中身を、サーバ側で組み立てる。
 *
 * 1日ぶんなので、3つのリーグ区分をまとめて取る(タブの件数を最初から出すため)。
 * 取得は一覧ページと同じ Data Cache に載る(getJson / getOfficialEventList は force-cache)。
 */

// タブの並び(オープン → シニア → ジュニア)。一覧ページのタブと同じ順
export const CITYLEAGUE_DATE_LEAGUE_TYPES = [1, 3, 2] as const;

export type CityleagueDateLeague = {
  leagueType: number;
  results: CityleagueResultType[];
  // その日の公式イベント。カードが店舗名・都道府県に使う(カードごとの個別取得を避ける)
  events: OfficialEventListItemType[];
};

// メタデータと本文で同じ日を2回取らないよう、同じ描画の中では1回にまとめる
export const getCityleagueResultsOnDate = cache(async function getCityleagueResultsOnDate(
  date: string,
): Promise<CityleagueDateLeague[]> {
  return Promise.all(
    CITYLEAGUE_DATE_LEAGUE_TYPES.map(async (leagueType) => {
      const results = await getResultsByDate(leagueType, date);

      // 結果の無いリーグ区分は店舗情報も要らない。取れなくてもカード側に個別取得の
      // フォールバックがあるので、結果は返す
      const events =
        results.length > 0
          ? await getOfficialEventList("2", String(leagueType), date)
              .then((res) => res.official_events ?? [])
              .catch(() => [])
          : [];

      return { leagueType, results, events };
    }),
  );
});
