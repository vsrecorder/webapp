import { Suspense } from "react";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityleagueRelatedSection from "@app/components/organisms/Cityleague/CityleagueRelatedSection";
import CityleagueResultDetailSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultDetailSkeleton";
import TemplateCityleagueResultByOfficialEventId from "@app/components/templates/CityleagueResultByOfficialEventId";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckArchetypeMap, DeckArchetypeType } from "@app/types/deck_archetype";
import { OfficialEventType } from "@app/types/official_event";
import {
  formatEventDate,
  getCityleagueResultByOfficialEventId,
  getOfficialEventById,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueEventOgImage } from "@app/utils/ogImage";
import { serializeJsonLd } from "@app/utils/breadcrumb";
import { cityleagueEventOgName, eventOgWinner } from "@app/utils/cityleagueEventOg";
import { deckDisplayName, isDeckArchetypeSeason } from "@app/utils/deckArchetype";
import { getDeckArchetypesByEvent } from "@app/utils/deckArchetypeServer";
import { getDeckSummaries, getDeckSummary } from "@app/utils/deckSummaryServer";
import { ogImageUrlFor } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function buildTitle(event: OfficialEventType): string {
  return `${event.title} ${event.shop_name}(${event.prefecture_name}) 結果・優勝デッキ`;
}

// description と構造化データに載せる優勝者と、その優勝デッキの呼び名。
// 呼び名はデッキ分類(バトラボ)の名前を優先し、無ければ主なポケモン(deckDisplayName)。
// 本文の冒頭(CityleagueResultByOfficialEventId)と同じ決め方にして、文言が食い違わないようにする
// archetype は OGP 画像に優勝デッキを載せるために持ち回る(分類が無ければ undefined)
type DescriptionWinner = {
  playerName: string;
  deckName: string;
  archetype: DeckArchetypeType | undefined;
};

async function getDescriptionWinner(
  officialEventId: number,
  cityleagueResult: CityleagueResultType | null,
): Promise<DescriptionWinner | null> {
  const winner = cityleagueResult?.results.find((result) => result.rank === 1);
  if (!winner) return null;

  // 本文と同じ URL・オプションの fetch なので、同じ描画の中では1回しか取りに行かない(メモ化)
  const [summary, archetypes] = await Promise.all([
    winner.deck_code ? getDeckSummary(winner.deck_code) : Promise.resolve(null),
    isDeckArchetypeSeason(cityleagueResult?.cityleague_schedule_id)
      ? getDeckArchetypesByEvent(officialEventId)
      : Promise.resolve<DeckArchetypeMap>({}),
  ]);

  const archetype = archetypes[winner.deck_code];

  return {
    playerName: winner.player_name,
    deckName: deckDisplayName(archetype, summary ?? undefined),
    archetype,
  };
}

function buildDescription(event: OfficialEventType, winner: DescriptionWinner | null): string {
  const winnerText = winner
    ? winner.deckName
      ? `優勝は${winner.playerName}選手（${winner.deckName}）。`
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

  const title = buildTitle(event);
  const winner = await getDescriptionWinner(officialEventId, cityleagueResult);
  const description = buildDescription(event, winner);
  const path = `/cityleague_results/${event.id}`;

  // 優勝デッキの分類が分かれば、画像にスプライトとデッキ名を載せる。分類は description のために
  // 既に引いてあるので、画像のために待ち時間は増えない。キーは載せる中身ごとに変わる(cityleagueEventOg)
  const ogWinner = eventOgWinner(winner?.archetype);
  const ogImageUrl = ogImageUrlFor(cityleagueEventOgName(event.id, ogWinner), () =>
    renderCityleagueEventOgImage(event, ogWinner),
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

  /*
   * 構造化データ(と description)に載せる優勝デッキだけ、ここで待つ。
   *
   * generateMetadata が同じ取得をしているので、1回の描画の中では fetch がまとめられ、
   * 上流への往復は増えない。入賞16件のカード内訳を全部待つのとは桁が違う
   * (デッキ分類は大会単位の 1 本で、本文側の取得とも同じ URL なのでまとめられる)。
   */
  const winner = await getDescriptionWinner(officialEventId, cityleagueResult);

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
      {/*
       * 入賞デッキのカード内訳は待たずに流す。
       *
       * 内訳は deckcard-api がデッキコードごとに引くもので、キャッシュに無いものは
       * 公式サイトへ取りに行く(1件 0.4秒前後)。1ページに16件並ぶため、これを待ってから
       * HTML を返すと本番で平均1.0秒・最大8.4秒かかっていた(nginx ログ7日ぶん、
       * 他のページは0.04〜0.13秒)。
       *
       * ここで区切ると、戻り導線・イベント情報・順位・選手名・デッキ画像は先に届き、
       * カード内訳は後から流れて差し替わる。内訳は本文の付随物なので、
       * 先に出せるものを止めておく理由が無い。検索エンジンもストリーミングされた
       * 最終的な HTML を読むため、テキストは従来どおり載る。
       */}
      <Suspense
        fallback={
          <CityleagueResultDetailSkeleton
            withDeckArchetype={isDeckArchetypeSeason(cityleagueResult.cityleague_schedule_id)}
          />
        }
      >
        <ResultsWithDeckSummaries event={event} cityleagueResult={cityleagueResult} />
      </Suspense>
    </>
  );
}

// 入賞デッキのカード内訳とデッキの種類を待ってから、結果本体を描く
async function ResultsWithDeckSummaries({
  event,
  cityleagueResult,
}: {
  event: OfficialEventType;
  cityleagueResult: CityleagueResultType;
}) {
  /*
   * デッキの種類(バトラボのデッキ分類)はカード内訳と並べて待つ。
   *
   * 分類は 2027 シーズン以降の大会にしか付かないので、それより前のイベントは引かない
   * (vslab は旧シーズンを扱わず「無い」と答えるだけ。理由は utils/deckArchetype)。
   * 取れなくても空の辞書が返り、種類の行が無いだけでページは出る。
   */
  const [deckSummaries, deckArchetypes] = await Promise.all([
    getDeckSummaries(cityleagueResult.results.map((result) => result.deck_code)),
    isDeckArchetypeSeason(cityleagueResult.cityleague_schedule_id)
      ? getDeckArchetypesByEvent(event.id)
      : Promise.resolve({}),
  ]);

  return (
    <TemplateCityleagueResultByOfficialEventId
      event={event}
      cityleagueResult={cityleagueResult}
      deckSummaries={deckSummaries}
      deckArchetypes={deckArchetypes}
      /*
       * 末尾の関連リンクも待たずに流す。
       *
       * 同じ Suspense の中に置くと、結果本文がカード内訳と関連リンクの「遅い方」に
       * 律速される。関連リンクは結果が登録済みの全イベント(数千件)と同じ月の
       * イベント一覧を突き合わせて作るもので、キャッシュが冷えていると本文より
       * 遅くなりうる。ページ末尾にあり初期表示に要らないので、後から流し込む。
       */
      relatedSection={
        // props で渡す Suspense には key を付ける(理由は一覧ページ側のコメント)
        <Suspense key="related" fallback={null}>
          <CityleagueRelatedSection event={event} />
        </Suspense>
      }
    />
  );
}
