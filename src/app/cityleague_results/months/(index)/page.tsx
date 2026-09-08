import type { Metadata } from "next";

import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";
import CityleagueIndexList from "@app/components/organisms/Cityleague/CityleagueIndexList";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  formatMonthKey,
  getAllCityleagueEventRefs,
  toMonthKey,
} from "@app/utils/cityleague";

const title = "開催月から探す - シティリーグ結果";
const description =
  "シティリーグの結果を開催月ごとに一覧できます。過去に開催された全国のシティリーグを月単位でさかのぼり、優勝からベスト16までのデッキコードを確認できます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cityleague_results/months" },
  openGraph: {
    url: "/cityleague_results/months",
    type: "website",
    title,
    description,
    locale: "ja_JP",
    siteName: "バトレコ",
  },
};

export default async function Page() {
  const eventRefs = await getAllCityleagueEventRefs();

  const counts = new Map<string, number>();
  for (const ref of eventRefs) {
    const monthKey = toMonthKey(ref.date);
    counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
  }

  // 新しい月から並べる。
  const items = [...counts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, count]) => ({
      href: `/cityleague_results/months/${monthKey}`,
      title: formatMonthKey(monthKey),
      count,
    }));

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "開催月から探す", path: "/cityleague_results/months" },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results"
          backLabel="シティリーグ結果"
          eyebrow="MONTH"
          title="開催月から探す"
          count={eventRefs.length}
        />

        <CityleagueIndexList items={items} />
      </div>
    </>
  );
}
