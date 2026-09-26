import type { Metadata } from "next";

import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";
import CityleagueIndexList from "@app/components/organisms/Cityleague/CityleagueIndexList";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import { formatMonthKey, getAllCityleagueEventRefs } from "@app/utils/cityleague";
import { dateParamToMonthKey, formatDateParam, toDateParam } from "@app/utils/cityleagueDate";
import { OG_SIZE, renderCityleagueDateListOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

const title = "開催日から探す - シティリーグ結果";
const description =
  "シティリーグの結果を開催日ごとに一覧できます。日付を選ぶと、その日に開催された全国のシティリーグを店舗ごとに確認でき、優勝からベスト16までのデッキコードを見られます。";

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = ogImageUrlFor("cityleague_results/dates", renderCityleagueDateListOgImage);

  return {
    title,
    description,
    alternates: { canonical: "/cityleague_results/dates" },
    openGraph: {
      url: "/cityleague_results/dates",
      type: "website",
      title,
      description,
      locale: "ja_JP",
      siteName: "バトレコ",
      images: ogImageUrl ? [{ url: ogImageUrl, ...OG_SIZE, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: "@vsrecorder_mobi",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function Page() {
  const eventRefs = await getAllCityleagueEventRefs();

  // 開催日ごとの大会数。toDateParam は時刻の足し算だけなので、全件(約7,800件)に掛けても軽い
  const counts = new Map<string, number>();
  for (const ref of eventRefs) {
    const dateParam = toDateParam(ref.date);
    counts.set(dateParam, (counts.get(dateParam) ?? 0) + 1);
  }

  // 新しい日から並べ、開催月ごとに区切る(数百日あるので、月の見出しで目的の日を探しやすくする)
  const months = new Map<string, { href: string; title: string; count: number }[]>();
  for (const [dateParam, count] of [...counts.entries()].sort((a, b) =>
    b[0].localeCompare(a[0]),
  )) {
    const monthKey = dateParamToMonthKey(dateParam);
    const items = months.get(monthKey) ?? [];
    items.push({
      href: `/cityleague_results/dates/${dateParam}`,
      title: formatDateParam(dateParam),
      count,
    });
    months.set(monthKey, items);
  }

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "開催日から探す", path: "/cityleague_results/dates" },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results"
          backLabel="シティリーグ結果"
          eyebrow="DATE"
          title="開催日から探す"
          count={eventRefs.length}
        />

        {[...months.entries()].map(([monthKey, items]) => (
          <section key={monthKey} className="flex flex-col gap-1.5">
            <h2 className="px-0.5 font-bold text-small text-default-700">
              {formatMonthKey(monthKey)}
            </h2>
            <CityleagueIndexList items={items} />
          </section>
        ))}
      </div>
    </>
  );
}
