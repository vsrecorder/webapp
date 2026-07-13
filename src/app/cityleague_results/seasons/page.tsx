import type { Metadata } from "next";

import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";
import CityleagueIndexList from "@app/components/organisms/Cityleague/CityleagueIndexList";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  findTermByDate,
  formatTermRange,
  getAllCityleagueEventRefs,
  getCityleagueSeasons,
} from "@app/utils/cityleague";

const title = "シーズンから探す - シティリーグ結果";
const description =
  "シティリーグの結果をシーズンごとに一覧できます。各シーズンに開催された全国の店舗の結果と、優勝からベスト16までのデッキコードを掲載しています。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cityleague_results/seasons" },
  openGraph: {
    url: "/cityleague_results/seasons",
    type: "website",
    title,
    description,
    locale: "ja_JP",
    siteName: "バトレコ",
  },
};

export default async function Page() {
  const [seasons, eventRefs] = await Promise.all([
    getCityleagueSeasons(),
    getAllCityleagueEventRefs(),
  ]);

  // イベントの開催日から、それが属するシーズンを引き当てて件数を数える。
  const counts = new Map<string, number>();
  for (const ref of eventRefs) {
    const season = findTermByDate(seasons, ref.date);
    if (!season) continue;
    counts.set(season.id, (counts.get(season.id) ?? 0) + 1);
  }

  // 結果が1件も無いシーズン（未開催の先のシーズンなど）は出さない。
  const items = seasons
    .filter((season) => (counts.get(season.id) ?? 0) > 0)
    .map((season) => ({
      href: `/cityleague_results/seasons/${season.id}`,
      title: season.title,
      subtitle: formatTermRange(season),
      count: counts.get(season.id) ?? 0,
    }));

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "シーズンから探す", path: "/cityleague_results/seasons" },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results"
          backLabel="シティリーグ結果"
          eyebrow="SEASON"
          title="シーズンから探す"
          count={items.reduce((total, item) => total + item.count, 0)}
        />

        <CityleagueIndexList items={items} />
      </div>
    </>
  );
}
