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

  // 結果が確定した過去のイベントは内容が変わらないため、lastModified に開催日を入れて
  // 再クロールの必要が無いことをクローラに伝える。
  const eventPages: MetadataRoute.Sitemap = eventRefs.map((event) => ({
    url: `${url}/cityleague_results/${event.id}`,
    lastModified: new Date(event.date),
    changeFrequency: "yearly",
  }));

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
