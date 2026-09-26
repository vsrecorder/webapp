import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  formatMonthKey,
  getCityleagueEventsInTerm,
  monthKeyToTerm,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueMonthOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    month: string;
  }>;
};

function buildTitle(monthKey: string): string {
  return `${formatMonthKey(monthKey)}のシティリーグ入賞デッキ一覧`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;

  const term = monthKeyToTerm(month);

  if (!term) {
    return { title: "シティリーグ結果" };
  }

  const title = buildTitle(month);
  const description = `${formatMonthKey(month)}に開催された全国のシティリーグの結果一覧です。店舗ごとに、優勝からベスト16までの入賞者のデッキコードを掲載しています。`;
  const path = `/cityleague_results/months/${month}`;

  // 形式さえ合えばどの月でも URL になるため、結果のある月だけ画像を作る
  // (存在しない月のURLを叩かれるたびに、ストレージへ画像を置かせないため)。
  // 本文と同じ取得なので、同じ描画の中では1回しか取りに行かない(メモ化)。
  const events = await getCityleagueEventsInTerm(term.fromDate, term.toDate);
  const ogImageUrl =
    events.length > 0
      ? ogImageUrlFor(`cityleague_results/months/${month}`, () =>
          renderCityleagueMonthOgImage(formatMonthKey(month)),
        )
      : null;

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
  const { month } = await params;

  const term = monthKeyToTerm(month);

  if (!term) {
    notFound();
  }

  const events = await getCityleagueEventsInTerm(term.fromDate, term.toDate);

  // 存在しない月（結果0件）のページをインデックスさせないため、404 にする。
  if (events.length === 0) {
    notFound();
  }

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "開催月から探す", path: "/cityleague_results/months" },
    { name: formatMonthKey(month), path: `/cityleague_results/months/${month}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results/months"
          backLabel="開催月から探す"
          eyebrow="MONTH"
          title={buildTitle(month)}
          count={events.length}
        />

        <CityleagueEventLinkList events={events} />
      </div>
    </>
  );
}
