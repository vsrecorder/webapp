import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LuCalendar, LuChevronRight } from "react-icons/lu";

import CityleagueDateResults from "@app/components/organisms/Cityleague/CityleagueDateResults";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import { formatMonthKey } from "@app/utils/cityleague";
import { dateParamToMonthKey, formatDateParam, parseDateParam } from "@app/utils/cityleagueDate";
import { getCityleagueResultsOnDate } from "@app/utils/cityleagueDateServer";
import { OG_SIZE, renderCityleagueDateOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    date: string;
  }>;
};

function buildTitle(dateLabel: string): string {
  return `${dateLabel}のシティリーグ結果・優勝デッキ一覧`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const dateParam = parseDateParam(date);

  if (!dateParam) {
    return { title: "シティリーグ結果" };
  }

  const dateLabel = formatDateParam(dateParam);
  const title = buildTitle(dateLabel);
  const description = `${dateLabel}に開催された全国のシティリーグの結果です。オープン・シニア・ジュニアのリーグ別に、店舗ごとの優勝からベスト16までの入賞者のデッキを掲載しています。`;
  const path = `/cityleague_results/dates/${dateParam}`;

  // 形式さえ合えばどの日でも URL になるため、結果のある日だけ画像を作る
  // (存在しない日の URL を叩かれるたびに、ストレージへ画像を置かせないため)。
  // 本文と同じ取得なので、同じ描画の中では1回しか取りに行かない(cache)。
  const leagues = await getCityleagueResultsOnDate(dateParam);
  const hasResults = leagues.some((league) => league.results.length > 0);
  const ogImageUrl = hasResults
    ? ogImageUrlFor(`cityleague_results/dates/${dateParam}`, () =>
        renderCityleagueDateOgImage(dateLabel),
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
  const { date } = await params;
  const dateParam = parseDateParam(date);

  if (!dateParam) {
    notFound();
  }

  const leagues = await getCityleagueResultsOnDate(dateParam);
  const total = leagues.reduce((sum, league) => sum + league.results.length, 0);

  // 結果の無い日(開催が無い日・まだ登録されていない日)のページをインデックスさせないため、404 にする
  if (total === 0) {
    notFound();
  }

  const dateLabel = formatDateParam(dateParam);
  const monthKey = dateParamToMonthKey(dateParam);

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "開催日から探す", path: "/cityleague_results/dates" },
    { name: dateLabel, path: `/cityleague_results/dates/${dateParam}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results/dates"
          backLabel="開催日から探す"
          eyebrow="DATE"
          title={buildTitle(dateLabel)}
          count={total}
        />

        <CityleagueDateResults leagues={leagues} />

        {/* 同じ月の他の開催日へ横に辿れるよう、開催月のページへ繋ぐ */}
        <Link
          href={`/cityleague_results/months/${monthKey}`}
          className="flex items-center justify-between gap-2 rounded-2xl border border-default-100 bg-content1 px-3 py-3 hover:bg-default-50"
        >
          <span className="flex items-center gap-2 font-bold text-small">
            <LuCalendar className="text-primary" />
            {formatMonthKey(monthKey)}のシティリーグ結果
          </span>
          <LuChevronRight className="shrink-0 text-default-300" />
        </Link>
      </div>
    </>
  );
}
