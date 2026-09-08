import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";

import ChampionsleagueLeagueList, {
  ChampionsleagueLeagueListItem,
} from "@app/components/organisms/Championsleague/ChampionsleagueLeagueList";
import ChampionsleagueRelatedSection from "@app/components/organisms/Championsleague/ChampionsleagueRelatedSection";
import { formatChampionsleagueWinner } from "@app/components/organisms/Championsleague/ChampionsleagueResultByLeague";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { ChampionsleagueEventResultType } from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { DeckSummaryType } from "@app/types/deckcard";

import {
  championsleagueLeagueTitle,
  getChampionsleagueResultsByScheduleId,
  getChampionsleagueScheduleById,
  getOfficialEventsByIds,
  leagueSlugFromType,
  leagueTypeOrder,
} from "@app/utils/championsleague";
import { formatTermRange } from "@app/utils/cityleague";
import { serializeJsonLd } from "@app/utils/breadcrumb";
import { getDeckSummaries } from "@app/utils/deckSummaryServer";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function buildTitle(schedule: ChampionsleagueScheduleType): string {
  return `${schedule.title.trim()} 結果・優勝デッキ`;
}

// 表示・リンクの順はマスター → シニア → ジュニア → オープン。
// core-apiserver も league_type の降順で返すが、区分の並びはページ側の決めごとなのでここで揃える。
function sortByLeague(
  eventResults: ChampionsleagueEventResultType[],
): ChampionsleagueEventResultType[] {
  return [...eventResults].sort(
    (a, b) => leagueTypeOrder(a.league_type) - leagueTypeOrder(b.league_type),
  );
}

function buildDescription(
  schedule: ChampionsleagueScheduleType,
  eventResults: ChampionsleagueEventResultType[],
  deckSummaries: Record<string, DeckSummaryType>,
): string {
  const leagueTitles = sortByLeague(eventResults)
    .map((eventResult) => championsleagueLeagueTitle(eventResult.league_type))
    .filter((title) => title !== "");

  // 代表として最上位の区分(マスター)の優勝を1件だけ載せる。説明文は全区分ぶんを並べるには短い。
  const headline = sortByLeague(eventResults).find((eventResult) =>
    eventResult.results.some((result) => result.rank === 1),
  );
  const winner = headline?.results.find((result) => result.rank === 1);
  const winnerText =
    winner && headline
      ? `${championsleagueLeagueTitle(headline.league_type)}リーグの優勝は` +
        `${formatChampionsleagueWinner(winner, deckSummaries)}。`
      : "";

  return (
    `${formatTermRange(schedule)}に開催された${schedule.title.trim()}の結果です。${winnerText}` +
    `${leagueTitles.length > 0 ? `${leagueTitles.join("・")}の各リーグについて、` : ""}` +
    `優勝からベスト16までの入賞者のデッキコードとカードリストをリーグ区分ごとに掲載しています。`
  );
}

// 本文と generateMetadata で同じ取得をするため、まとめて引く小さなヘルパー。
// 同じ URL・オプションの fetch なので、同じ描画の中では1回しか取りに行かない(メモ化)。
async function getPageData(id: string) {
  const [schedule, championsleagueResult] = await Promise.all([
    getChampionsleagueScheduleById(id),
    getChampionsleagueResultsByScheduleId(id),
  ]);

  return { schedule, championsleagueResult };
}

// 一覧に添える優勝デッキの要約。区分ごとの優勝1名ぶんしか引かないので、
// 区分ページ(16名)と違って取得は数件で済む。
async function getWinnerDeckSummaries(
  eventResults: ChampionsleagueEventResultType[],
): Promise<Record<string, DeckSummaryType>> {
  return getDeckSummaries(
    eventResults
      .map(
        (eventResult) =>
          eventResult.results.find((result) => result.rank === 1)?.deck_code ?? "",
      )
      .filter((code) => code !== ""),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { schedule, championsleagueResult } = await getPageData(id);

  if (!schedule) {
    return { title: "大型大会の結果" };
  }

  const eventResults = championsleagueResult?.event_results ?? [];
  const deckSummaries = await getWinnerDeckSummaries(eventResults);

  const title = buildTitle(schedule);
  const description = buildDescription(schedule, eventResults, deckSummaries);
  const path = `/cityleague_results/championsleagues/${schedule.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      type: "article",
      title,
      description,
      locale: "ja_JP",
      siteName: "バトレコ",
    },
    twitter: {
      card: "summary",
      site: "@vsrecorder_mobi",
      title,
      description,
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const { schedule, championsleagueResult } = await getPageData(id);

  if (!schedule || !championsleagueResult) {
    notFound();
  }

  const eventResults = sortByLeague(championsleagueResult.event_results);

  const [deckSummaries, officialEvents] = await Promise.all([
    getWinnerDeckSummaries(eventResults),
    getOfficialEventsByIds(
      eventResults.map((eventResult) => eventResult.official_event_id),
    ),
  ]);

  const scheduleTitle = schedule.title.trim();
  const resultCount = eventResults.reduce(
    (total, eventResult) => total + eventResult.results.length,
    0,
  );
  const venueEvent = eventResults
    .map((eventResult) => officialEvents[eventResult.official_event_id])
    .find((event) => !!event?.venue);

  const items: ChampionsleagueLeagueListItem[] = eventResults.map((eventResult) => {
    const leagueTitle = championsleagueLeagueTitle(eventResult.league_type);
    const winner = eventResult.results.find((result) => result.rank === 1);

    return {
      href: `/cityleague_results/championsleagues/${schedule.id}/${leagueSlugFromType(eventResult.league_type)}`,
      title: leagueTitle ? `${leagueTitle}リーグ` : "結果",
      date: eventResult.date,
      resultCount: eventResult.results.length,
      winner: winner ? formatChampionsleagueWinner(winner, deckSummaries) : undefined,
    };
  });

  const description = buildDescription(schedule, eventResults, deckSummaries);

  const domain = process.env.VSRECORDER_DOMAIN;
  const pageUrl = `https://${domain}/cityleague_results/championsleagues/${schedule.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: scheduleTitle,
        description,
        startDate: String(schedule.from_date),
        endDate: String(schedule.to_date),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: pageUrl,
        ...(venueEvent
          ? {
              location: {
                "@type": "Place",
                name: venueEvent.venue,
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "JP",
                  streetAddress: venueEvent.address,
                },
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "バトレコ",
            item: `https://${domain}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "シティリーグ結果",
            item: `https://${domain}/cityleague_results`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "大型大会の結果",
            item: `https://${domain}/cityleague_results/championsleagues`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: scheduleTitle,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results/championsleagues"
          backLabel="大型大会の結果一覧"
          eyebrow="CHAMPIONS LEAGUE"
          title={scheduleTitle}
          subtitle={formatTermRange(schedule)}
          count={items.length}
          countLabel="結果が登録されたリーグ区分"
        />

        <Card className="w-full">
          <CardHeader className="flex-col items-start gap-2 px-3 py-3">
            {venueEvent?.venue && (
              <Chip size="sm" radius="md" variant="bordered">
                <small className="font-bold">{venueEvent.venue}</small>
              </Chip>
            )}
          </CardHeader>
          <CardBody className="gap-2 px-3 pt-0 pb-3">
            <p className="text-tiny leading-relaxed text-default-500">{description}</p>
            <p className="text-tiny text-default-400">入賞 {resultCount}名</p>
          </CardBody>
        </Card>

        <ChampionsleagueLeagueList items={items} />

        <ChampionsleagueRelatedSection schedule={schedule} />
      </div>
    </>
  );
}
