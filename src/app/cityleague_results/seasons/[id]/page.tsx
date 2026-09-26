import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  CityleagueTerm,
  formatTermRange,
  getCityleagueEventsInTerm,
  getCityleagueSeasons,
  toTermKey,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueTermOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function findSeason(id: string): Promise<CityleagueTerm | undefined> {
  const seasons = await getCityleagueSeasons();

  return seasons.find((season) => season.id === id);
}

function buildTitle(season: CityleagueTerm): string {
  return `${season.title} の結果・入賞デッキ一覧`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const season = await findSeason(id);

  if (!season) {
    return { title: "シティリーグ結果" };
  }

  const title = buildTitle(season);
  const description = `${season.title}（${formatTermRange(season)}）に開催されたシティリーグの結果一覧です。全国の店舗ごとに、優勝からベスト16までの入賞者のデッキコードを掲載しています。`;
  const path = `/cityleague_results/seasons/${season.id}`;

  const ogImageUrl = ogImageUrlFor(
    `cityleague_results/seasons/${season.id}-${toTermKey(season)}`,
    () => renderCityleagueTermOgImage(season.title, season),
  );

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
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

export default async function Page({ params }: Props) {
  const { id } = await params;

  const season = await findSeason(id);

  if (!season) {
    notFound();
  }

  const events = await getCityleagueEventsInTerm(season.from_date, season.to_date);

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "シーズンから探す", path: "/cityleague_results/seasons" },
    { name: season.title, path: `/cityleague_results/seasons/${season.id}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results/seasons"
          backLabel="シーズンから探す"
          eyebrow="SEASON"
          title={buildTitle(season)}
          subtitle={formatTermRange(season)}
          count={events.length}
        />

        <CityleagueEventLinkList events={events} />
      </div>
    </>
  );
}
