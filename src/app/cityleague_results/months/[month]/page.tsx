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

type Props = {
  params: Promise<{
    month: string;
  }>;
};

function buildTitle(monthKey: string): string {
  return `${formatMonthKey(monthKey)}のシティリーグ結果・優勝デッキ一覧`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;

  if (!monthKeyToTerm(month)) {
    return { title: "シティリーグ結果" };
  }

  const title = buildTitle(month);
  const description = `${formatMonthKey(month)}に開催された全国のシティリーグの結果一覧です。店舗ごとに、優勝からベスト16までの入賞者のデッキコードを掲載しています。`;
  const path = `/cityleague_results/months/${month}`;

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
