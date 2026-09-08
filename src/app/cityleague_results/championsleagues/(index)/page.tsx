import type { Metadata } from "next";

import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";
import CityleagueIndexList from "@app/components/organisms/Cityleague/CityleagueIndexList";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import { getChampionsleagueScheduleSummaries } from "@app/utils/championsleague";
import { formatTermRange } from "@app/utils/cityleague";

const title = "チャンピオンズリーグ・大型大会の結果一覧";
const description =
  "チャンピオンズリーグとポケモンジャパンチャンピオンシップス（PJCS）の結果を大会ごとに掲載しています。マスター／シニア／ジュニアの各リーグについて、優勝からベスト16までの入賞者のデッキコードとカードリストを確認できます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cityleague_results/championsleagues" },
  openGraph: {
    url: "/cityleague_results/championsleagues",
    type: "website",
    title,
    description,
    locale: "ja_JP",
    siteName: "バトレコ",
  },
};

export default async function Page() {
  const summaries = await getChampionsleagueScheduleSummaries();

  const items = summaries.map(({ schedule, eventCount }) => ({
    href: `/cityleague_results/championsleagues/${schedule.id}`,
    title: schedule.title.trim(),
    subtitle: formatTermRange(schedule),
    count: eventCount,
  }));

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "大型大会の結果", path: "/cityleague_results/championsleagues" },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results"
          backLabel="シティリーグ結果"
          eyebrow="CHAMPIONS LEAGUE"
          title="大型大会の結果"
          subtitle="チャンピオンズリーグ / ポケモンジャパンチャンピオンシップス"
          count={items.length}
          countLabel="結果が登録された大会"
        />

        {items.length > 0 ? (
          <CityleagueIndexList items={items} countUnit="区分" />
        ) : (
          <p className="py-10 text-center text-small text-default-400">
            結果が登録された大型大会はまだありません。
          </p>
        )}
      </div>
    </>
  );
}
