import type { Metadata } from "next";
import { notFound } from "next/navigation";

import TemplateCityleagueResultByOfficialEventId from "@app/components/templates/CityleagueResultByOfficialEventId";

import { OfficialEventType } from "@app/types/official_event";
import {
  formatEventDate,
  getCityleagueResultByOfficialEventId,
  getOfficialEventById,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueEventOgImage } from "@app/utils/ogImage";
import { ensureOgImage } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function buildTitle(event: OfficialEventType): string {
  return `${event.title} ${event.shop_name}(${event.prefecture_name}) 結果・優勝デッキ`;
}

function buildDescription(event: OfficialEventType): string {
  return `${formatEventDate(event.date)}に${event.prefecture_name}の${event.shop_name}で開催された${event.title}（${event.league_title}リーグ）の結果です。優勝からベスト16までの入賞者のデッキコードを掲載しています。`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const event = await getOfficialEventById(Number(id));

  if (!event) {
    return { title: "シティリーグ結果" };
  }

  const title = buildTitle(event);
  const description = buildDescription(event);
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

  const domain = process.env.VSRECORDER_DOMAIN;
  const pageUrl = `https://${domain}/cityleague_results/${event.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Event",
        name: `${event.title} ${event.shop_name}`,
        description: buildDescription(event),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TemplateCityleagueResultByOfficialEventId
        event={event}
        cityleagueResult={cityleagueResult}
      />
    </>
  );
}
