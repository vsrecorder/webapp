import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ChampionsleagueLeagueRelatedSection from "@app/components/organisms/Championsleague/ChampionsleagueLeagueRelatedSection";
import ChampionsleagueResultByLeague, {
  formatChampionsleagueWinner,
} from "@app/components/organisms/Championsleague/ChampionsleagueResultByLeague";

import { ChampionsleagueEventResultType } from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { DeckSummaryType } from "@app/types/deckcard";
import { OfficialEventType } from "@app/types/official_event";

import {
  championsleagueLeagueTitle,
  getChampionsleagueResultsByScheduleId,
  getChampionsleagueScheduleById,
  getOfficialEventsByIds,
  leagueTypeFromSlug,
} from "@app/utils/championsleague";
import { formatTermRange } from "@app/utils/cityleague";
import { serializeJsonLd } from "@app/utils/breadcrumb";
import { getDeckSummaries, getDeckSummary } from "@app/utils/deckSummaryServer";

type Props = {
  params: Promise<{
    id: string;
    league: string;
  }>;
};

function buildLeagueName(leagueType: number): string {
  const leagueTitle = championsleagueLeagueTitle(leagueType);

  return leagueTitle ? `${leagueTitle}リーグ` : "結果";
}

function buildTitle(
  schedule: ChampionsleagueScheduleType,
  leagueType: number,
): string {
  return `${schedule.title.trim()} ${buildLeagueName(leagueType)} 結果・優勝デッキ`;
}

function buildDescription(
  schedule: ChampionsleagueScheduleType,
  leagueType: number,
  eventResults: ChampionsleagueEventResultType[],
  deckSummaries: Record<string, DeckSummaryType>,
): string {
  const results = eventResults.flatMap((eventResult) => eventResult.results);
  const winner = results.find((result) => result.rank === 1);
  const winnerText = winner
    ? `優勝は${formatChampionsleagueWinner(winner, deckSummaries)}。`
    : "";

  return (
    `${formatTermRange(schedule)}に開催された${schedule.title.trim()}` +
    `（${buildLeagueName(leagueType)}）の結果です。${winnerText}` +
    `優勝からベスト16までの入賞${results.length}名のデッキコードとカードリストを掲載しています。`
  );
}

// 本文と generateMetadata で同じ取得をするため、まとめて引く小さなヘルパー。
// 同じ URL・オプションの fetch なので、同じ描画の中では1回しか取りに行かない(メモ化)。
async function getPageData(id: string, leagueType: number) {
  const [schedule, championsleagueResult] = await Promise.all([
    getChampionsleagueScheduleById(id),
    getChampionsleagueResultsByScheduleId(id, leagueType),
  ]);

  return { schedule, championsleagueResult };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, league } = await params;

  const leagueType = leagueTypeFromSlug(league);

  if (leagueType === null) {
    return { title: "大型大会の結果" };
  }

  const { schedule, championsleagueResult } = await getPageData(id, leagueType);

  if (!schedule) {
    return { title: "大型大会の結果" };
  }

  const eventResults = championsleagueResult?.event_results ?? [];

  // 説明文に載せるのは優勝デッキだけなので、ここでは1件しか引かない。
  const winnerDeckCode = eventResults
    .flatMap((eventResult) => eventResult.results)
    .find((result) => result.rank === 1)?.deck_code;
  const winnerSummary = winnerDeckCode ? await getDeckSummary(winnerDeckCode) : null;

  const title = buildTitle(schedule, leagueType);
  const description = buildDescription(
    schedule,
    leagueType,
    eventResults,
    winnerDeckCode && winnerSummary ? { [winnerDeckCode]: winnerSummary } : {},
  );
  const path = `/cityleague_results/championsleagues/${schedule.id}/${league}`;

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
  const { id, league } = await params;

  const leagueType = leagueTypeFromSlug(league);

  if (leagueType === null) {
    notFound();
  }

  // 検索エンジンに結果本文を読ませるため、クライアントではなくサーバ側で取得する。
  const { schedule, championsleagueResult } = await getPageData(id, leagueType);

  if (!schedule || !championsleagueResult) {
    notFound();
  }

  const eventResults = championsleagueResult.event_results;

  // 入賞デッキのカード内訳と、イベント名・会場のための公式イベント情報。
  const [deckSummaries, officialEvents] = await Promise.all([
    getDeckSummaries(
      eventResults.flatMap((eventResult) =>
        eventResult.results.map((result) => result.deck_code),
      ),
    ),
    getOfficialEventsByIds(
      eventResults.map((eventResult) => eventResult.official_event_id),
    ),
  ]);

  const description = buildDescription(
    schedule,
    leagueType,
    eventResults,
    deckSummaries,
  );

  const scheduleTitle = schedule.title.trim();
  const domain = process.env.VSRECORDER_DOMAIN;
  const scheduleUrl = `https://${domain}/cityleague_results/championsleagues/${schedule.id}`;
  const pageUrl = `${scheduleUrl}/${league}`;

  // 会場は official_events 側にしかない。引けたものがあれば構造化データにも載せる。
  const venueEvent: OfficialEventType | undefined = eventResults
    .map((eventResult) => officialEvents[eventResult.official_event_id])
    .find((event) => !!event?.venue);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: `${scheduleTitle} ${buildLeagueName(leagueType)}`,
        description,
        startDate: String(eventResults[0]?.date ?? schedule.from_date),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: pageUrl,
        superEvent: {
          "@type": "Event",
          name: scheduleTitle,
          url: scheduleUrl,
        },
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
            item: scheduleUrl,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: buildLeagueName(leagueType),
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
      <ChampionsleagueResultByLeague
        schedule={schedule}
        leagueType={leagueType}
        eventResults={eventResults}
        officialEvents={officialEvents}
        deckSummaries={deckSummaries}
        relatedSection={
          <ChampionsleagueLeagueRelatedSection
            schedule={schedule}
            leagueType={leagueType}
          />
        }
      />
    </>
  );
}
