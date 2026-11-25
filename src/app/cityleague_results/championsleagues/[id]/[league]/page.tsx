import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ReturnPositionArea from "@app/components/molecules/ReturnPositionArea";
import ChampionsleagueLeagueRelatedSection from "@app/components/organisms/Championsleague/ChampionsleagueLeagueRelatedSection";
import ChampionsleagueResultByLeague, {
  findHeadlineEvents,
  formatHeadlineWinners,
} from "@app/components/organisms/Championsleague/ChampionsleagueResultByLeague";

import { ChampionsleagueEventResultType } from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
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
import { getChampionsleagueDeckArchetypes } from "@app/utils/championsleagueArchetypeServer";
import { getDeckSummaries } from "@app/utils/deckSummaryServer";
import { OG_SIZE, renderChampionsleagueOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

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
  officialEvents: Record<number, OfficialEventType>,
  deckSummaries: Record<string, DeckSummaryType>,
  deckArchetypes: DeckArchetypeMap,
): string {
  const results = eventResults.flatMap((eventResult) => eventResult.results);
  const winnerText = formatHeadlineWinners(
    schedule,
    eventResults,
    officialEvents,
    deckSummaries,
    deckArchetypes,
  );

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

  // 1日目大会と2日目大会に分かれているかは大会名で決まるので、公式イベント情報を先に引く。
  const officialEvents = await getOfficialEventsByIds(
    eventResults.map((eventResult) => eventResult.official_event_id),
  );

  // 説明文に載せるのは優勝デッキだけなので、カード内訳は優勝のぶんしか引かない。
  // 種類(デッキ分類)は載せるイベントの入賞をまとめて引く(本文が同じ照会をするので、
  // 同じ描画の中では1回しか取りに行かない。優勝だけに絞ると別の照会が増える)。
  const headlineEvents = findHeadlineEvents(schedule, eventResults, officialEvents).map(
    ({ eventResult }) => eventResult,
  );
  const [deckSummaries, deckArchetypes] = await Promise.all([
    getDeckSummaries(
      headlineEvents.flatMap((eventResult) =>
        eventResult.results
          .filter((result) => result.rank === 1)
          .map((result) => result.deck_code),
      ),
    ),
    getChampionsleagueDeckArchetypes(schedule.id, headlineEvents, officialEvents),
  ]);

  const title = buildTitle(schedule, leagueType);
  const description = buildDescription(
    schedule,
    leagueType,
    eventResults,
    officialEvents,
    deckSummaries,
    deckArchetypes,
  );
  const path = `/cityleague_results/championsleagues/${schedule.id}/${league}`;

  const ogImageUrl = ogImageUrlFor(`championsleague_results/${schedule.id}/${league}`, () =>
    renderChampionsleagueOgImage(schedule, buildLeagueName(leagueType)),
  );

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

  // 1日目/2日目に分かれた区分は、開催順(古い順)に並べる。
  // core-apiserver は新しい日から返すため、そのままでは2日目が先に出る。
  const eventResults = [...championsleagueResult.event_results].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // 入賞デッキのカード内訳と、イベント名・会場のための公式イベント情報。
  const officialEventsPromise = getOfficialEventsByIds(
    eventResults.map((eventResult) => eventResult.official_event_id),
  );

  // 入賞デッキの種類(バトラボのデッキ分類。2027 シーズン以降の大会だけ)。
  // 環境は公式イベント情報にしか無いので、その取得を待ってから引く(カード内訳の取得とは並行)。
  // 取れなかったデッキは種類の行が無いだけで、ページは出す
  const deckArchetypesPromise = officialEventsPromise.then((events) =>
    getChampionsleagueDeckArchetypes(schedule.id, eventResults, events),
  );

  const [deckSummaries, officialEvents, deckArchetypes] = await Promise.all([
    getDeckSummaries(
      eventResults.flatMap((eventResult) =>
        eventResult.results.map((result) => result.deck_code),
      ),
    ),
    officialEventsPromise,
    deckArchetypesPromise,
  ]);

  const description = buildDescription(
    schedule,
    leagueType,
    eventResults,
    officialEvents,
    deckSummaries,
    deckArchetypes,
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
      {/* 公式サイトや別の区分へ進んで戻ったとき、元の位置で見せる */}
      <ReturnPositionArea>
        <ChampionsleagueResultByLeague
          schedule={schedule}
          leagueType={leagueType}
          eventResults={eventResults}
          officialEvents={officialEvents}
          deckSummaries={deckSummaries}
          deckArchetypes={deckArchetypes}
          relatedSection={
            <ChampionsleagueLeagueRelatedSection
              schedule={schedule}
              leagueType={leagueType}
            />
          }
        />
      </ReturnPositionArea>
    </>
  );
}
