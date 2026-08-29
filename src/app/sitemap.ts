import { MetadataRoute } from "next";

import {
  findTermByDate,
  getAllCityleagueEventRefs,
  getCityleagueSeasons,
  getEnvironments,
  toMonthKey,
} from "@app/utils/cityleague";

// sitemap.ts はデフォルトでビルド時に静的生成される。しかし VSRECORDER_DOMAIN は
// docker-compose が実行時にのみ与えるため、静的生成すると URL に "https://undefined" が
// 焼き込まれてサイトマップが機能しなくなる。リクエスト時に評価させて実行時の値を読む。
export const dynamic = "force-dynamic";

// 個別ページを sitemap に載せるシーズン数(新しい順)。
//
// 結果が登録された個別ページは 7,800 件あるが、Google のクロール割当はこのサイトに対して
// 1日15件程度(2026-08 の GSC 実測。「検出 - インデックス未登録」が 7,239 → 6,918 / 3週間)しか無く、
// 全件を載せると検索需要の無い過去シーズンにクロールが分散する。
// 需要は直近シーズンに集中するため、sitemap には直近ぶんだけを載せてそこへクロールを集中させる。
// それ以前の個別ページは月別ハブからのリンクで辿れる(sitemap はあくまで発見の優先度の入力で、
// 載せないからといって索引から外れるわけではない)。
const SITEMAP_EVENT_SEASON_COUNT = 2;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = "https://" + process.env.VSRECORDER_DOMAIN;

  const staticPages: MetadataRoute.Sitemap = [
    { url: url, changeFrequency: "always" },
    { url: url + "/cityleague_results", changeFrequency: "daily" },
    { url: url + "/cityleague_results/seasons", changeFrequency: "weekly" },
    { url: url + "/cityleague_results/environments", changeFrequency: "weekly" },
    { url: url + "/cityleague_results/months", changeFrequency: "weekly" },
    { url: url + "/deck_meta", changeFrequency: "weekly" },
    { url: url + "/kizuna", changeFrequency: "weekly" },
    { url: url + "/terms", changeFrequency: "monthly" },
    { url: url + "/privacy", changeFrequency: "monthly" },
    { url: url + "/policy", changeFrequency: "monthly" },
  ];

  const [eventRefs, seasons, environments] = await Promise.all([
    getAllCityleagueEventRefs(),
    getCityleagueSeasons(),
    getEnvironments(),
  ]);

  // 結果が1件も無いシーズン・環境・月はページ自体を出さないため、sitemap にも載せない。
  const seasonIds = new Set<string>();
  const environmentIds = new Set<string>();
  const monthKeys = new Set<string>();

  for (const ref of eventRefs) {
    seasonIds.add(findTermByDate(seasons, ref.date)?.id ?? "");
    environmentIds.add(findTermByDate(environments, ref.date)?.id ?? "");
    monthKeys.add(toMonthKey(ref.date));
  }
  seasonIds.delete("");
  environmentIds.delete("");

  // 個別ページを載せる期間の下限。結果のあるシーズンを新しい順に並べ、直近ぶんの先頭の開始日を採る。
  // スケジュールは先の(まだ結果の無い)シーズンも含むため、結果のあるものに限ってから選ぶ。
  // シーズンが引けない場合は絞らず全件を載せる(絞り込みの失敗で個別ページが丸ごと消えるのを防ぐ)。
  const recentSeasons = seasons
    .filter((season) => seasonIds.has(season.id))
    .sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime())
    .slice(0, SITEMAP_EVENT_SEASON_COUNT);
  const eventCutoff =
    recentSeasons.length > 0
      ? new Date(recentSeasons[recentSeasons.length - 1].from_date).getTime()
      : null;

  // 結果が確定した過去のイベントは内容が変わらないため、lastModified に開催日を入れて
  // 再クロールの必要が無いことをクローラに伝える。
  const eventPages: MetadataRoute.Sitemap = eventRefs
    .filter(
      (event) => eventCutoff === null || new Date(event.date).getTime() >= eventCutoff,
    )
    .map((event) => ({
      url: `${url}/cityleague_results/${event.id}`,
      lastModified: new Date(event.date),
      changeFrequency: "yearly",
    }));

  const hubPages: MetadataRoute.Sitemap = [
    ...[...seasonIds].map((id) => ({
      url: `${url}/cityleague_results/seasons/${id}`,
      changeFrequency: "weekly" as const,
    })),
    ...[...environmentIds].map((id) => ({
      url: `${url}/cityleague_results/environments/${id}`,
      changeFrequency: "weekly" as const,
    })),
    ...[...monthKeys].map((monthKey) => ({
      url: `${url}/cityleague_results/months/${monthKey}`,
      changeFrequency: "weekly" as const,
    })),
  ];

  return [...staticPages, ...hubPages, ...eventPages];
}
