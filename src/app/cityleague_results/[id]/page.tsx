import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityleagueRelatedSection from "@app/components/organisms/Cityleague/CityleagueRelatedSection";
import TemplateCityleagueResultByOfficialEventId from "@app/components/templates/CityleagueResultByOfficialEventId";

import { CityleagueResultType, CityleagueWinnerType } from "@app/types/cityleague_result";
import { OfficialEventType } from "@app/types/official_event";
import {
  formatEventDate,
  getCityleagueResultByOfficialEventId,
  getOfficialEventById,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueEventOgImage } from "@app/utils/ogImage";
import { serializeJsonLd } from "@app/utils/breadcrumb";
import { formatMainPokemon } from "@app/utils/deckSummary";
import { getDeckSummaries, getDeckSummary } from "@app/utils/deckSummaryServer";
import { ensureOgImage } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function buildTitle(event: OfficialEventType): string {
  return `${event.title} ${event.shop_name}(${event.prefecture_name}) 結果・優勝デッキ`;
}

// 優勝者と、その優勝デッキの主なポケモン。description と本文の冒頭で「何のデッキが勝ったか」に答える。
function toWinner(
  cityleagueResult: CityleagueResultType | null,
  mainPokemon: string[],
): CityleagueWinnerType | null {
  const winner = cityleagueResult?.results.find((result) => result.rank === 1);

  return winner ? { playerName: winner.player_name, mainPokemon } : null;
}

function buildDescription(
  event: OfficialEventType,
  winner: CityleagueWinnerType | null,
): string {
  const winnerText = winner
    ? winner.mainPokemon.length > 0
      ? `優勝は${formatMainPokemon(winner.mainPokemon)}デッキ（${winner.playerName}選手）。`
      : `優勝は${winner.playerName}選手。`
    : "";

  return `${formatEventDate(event.date)}に${event.prefecture_name}の${event.shop_name}で開催された${event.title}（${event.league_title}リーグ）の結果です。${winnerText}優勝からベスト16までの入賞者のデッキコードとカードリストを掲載しています。`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const officialEventId = Number(id);

  if (!Number.isInteger(officialEventId)) {
    return { title: "シティリーグ結果" };
  }

  // 本文と同じ URL・オプションの fetch なので、同じ描画の中では1回しか取りに行かない(メモ化)。
  const [event, cityleagueResult] = await Promise.all([
    getOfficialEventById(officialEventId),
    getCityleagueResultByOfficialEventId(officialEventId),
  ]);

  if (!event) {
    return { title: "シティリーグ結果" };
  }

  const winnerDeckCode = cityleagueResult?.results.find(
    (result) => result.rank === 1,
  )?.deck_code;
  const winnerSummary = winnerDeckCode ? await getDeckSummary(winnerDeckCode) : null;

  const title = buildTitle(event);
  const description = buildDescription(
    event,
    toWinner(cityleagueResult, winnerSummary?.mainPokemon ?? []),
  );
  const path = `/cityleague_results/${event.id}`;

  const ogImageUrl = await ensureOgImage(`cityleague_results/${event.id}`, () =>
    renderCityleagueEventOgImage(event),
  );

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
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
  const { id } = await params;
  const officialEventId = Number(id);

  if (!Number.isInteger(officialEventId)) {
    notFound();
  }

  // 検索エンジンに結果本文を読ませるため、クライアントではなくサーバ側で取得する。
  const [event, cityleagueResult] = await Promise.all([
    getOfficialEventById(officialEventId),
    getCityleagueResultByOfficialEventId(officialEventId),
  ]);

  if (!event || !cityleagueResult) {
    notFound();
  }

  // 入賞デッキのカード内訳。デッキの中身は CDN の画像で文字では追えないため、
  // ここで取得して主なポケモン・カードリストをテキストとして HTML に載せる。
  const deckSummaries = await getDeckSummaries(
    cityleagueResult.results.map((result) => result.deck_code),
  );
  const winnerDeckCode = cityleagueResult.results.find(
    (result) => result.rank === 1,
  )?.deck_code;
  const winner = toWinner(
    cityleagueResult,
    winnerDeckCode ? (deckSummaries[winnerDeckCode]?.mainPokemon ?? []) : [],
  );

  const domain = process.env.VSRECORDER_DOMAIN;
  const pageUrl = `https://${domain}/cityleague_results/${event.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: `${event.title} ${event.shop_name}`,
        description: buildDescription(event, winner),
        startDate: String(event.started_at),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: pageUrl,
        location: {
          "@type": "Place",
          name: event.shop_name,
          address: {
            "@type": "PostalAddress",
            addressCountry: "JP",
            addressRegion: event.prefecture_name,
            streetAddress: event.address,
          },
        },
        superEvent: {
          "@type": "Event",
          name: event.title,
        },
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
            name: `${event.title} ${event.shop_name}`,
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
      <TemplateCityleagueResultByOfficialEventId
        event={event}
        cityleagueResult={cityleagueResult}
        deckSummaries={deckSummaries}
        relatedSection={<CityleagueRelatedSection event={event} />}
      />
    </>
  );
}
