import type { Metadata } from "next";

import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";
import CityleagueIndexList from "@app/components/organisms/Cityleague/CityleagueIndexList";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  findTermByDate,
  formatTermRange,
  getAllCityleagueEventRefs,
  getEnvironments,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueEnvironmentListOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

const title = "環境から探す - シティリーグ結果";
const description =
  "シティリーグの結果を対戦環境ごとに一覧できます。環境単位で優勝デッキの傾向を追えるため、デッキ研究やレギュレーションの振り返りに使えます。";

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = ogImageUrlFor(
    "cityleague_results/environments",
    renderCityleagueEnvironmentListOgImage,
  );

  return {
    title,
    description,
    alternates: { canonical: "/cityleague_results/environments" },
    openGraph: {
      url: "/cityleague_results/environments",
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
  const [environments, eventRefs] = await Promise.all([
    getEnvironments(),
    getAllCityleagueEventRefs(),
  ]);

  const counts = new Map<string, number>();
  for (const ref of eventRefs) {
    const environment = findTermByDate(environments, ref.date);
    if (!environment) continue;
    counts.set(environment.id, (counts.get(environment.id) ?? 0) + 1);
  }

  // シティリーグが開催されなかった環境（結果0件）は出さない。
  const items = environments
    .filter((environment) => (counts.get(environment.id) ?? 0) > 0)
    .map((environment) => ({
      href: `/cityleague_results/environments/${environment.id}`,
      title: `『${environment.title}』環境`,
      subtitle: formatTermRange(environment),
      count: counts.get(environment.id) ?? 0,
    }));

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "環境から探す", path: "/cityleague_results/environments" },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results"
          backLabel="シティリーグ結果"
          eyebrow="ENVIRONMENT"
          title="環境から探す"
          count={items.reduce((total, item) => total + item.count, 0)}
        />

        <CityleagueIndexList items={items} />
      </div>
    </>
  );
}
