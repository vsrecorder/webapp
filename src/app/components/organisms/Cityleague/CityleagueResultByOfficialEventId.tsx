"use client";

import NextLink from "next/link";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";
import { Image } from "@heroui/react";

import { LuChevronLeft, LuLayers, LuUsers } from "react-icons/lu";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckSummaryType } from "@app/types/deckcard";
import { OfficialEventType } from "@app/types/official_event";

import { buildRankSections } from "@app/utils/cityleagueRank";
import { formatMainPokemon } from "@app/utils/deckSummary";
import { safeExternalUrl } from "@app/utils/url";

type Props = {
  event: OfficialEventType;
  cityleagueResult: CityleagueResultType;
  // デッキコードごとのカード内訳の要約(サーバ側で取得済み)。無いデッキは画像とコードだけを出す。
  deckSummaries?: Record<string, DeckSummaryType>;
  // 同じ月の他会場・各ハブへのリンク。サーバコンポーネントのまま受け取るため props で差し込む。
  relatedSection?: React.ReactNode;
};

// データはサーバコンポーネント側で取得済みのものを受け取る。
// ここで fetch しないことで、検索エンジンに結果本文が入ったHTMLが渡る。
export default function CityleagueResultByOfficialEventId({
  event,
  cityleagueResult,
  deckSummaries = {},
  relatedSection,
}: Props) {
  const date = new Date(event.date).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const sections = buildRankSections(cityleagueResult.results);
  const deckCodeCount = cityleagueResult.results.filter(
    (result) => !!result.deck_code,
  ).length;

  const winner = cityleagueResult.results.find((result) => result.rank === 1);
  const winnerMainPokemon = winner
    ? formatMainPokemon(deckSummaries[winner.deck_code]?.mainPokemon ?? [])
    : "";

  // 順位ごとの「主なポケモン」。検索結果から来た人が最初に知りたい「何のデッキが勝ったか」を
  // 冒頭で答える。要約が取れなかったデッキは省き、1つも無い順位は行ごと出さない。
  const deckOverview = sections
    .map((section) => ({
      label: section.label,
      decks: section.results
        .map((result) =>
          formatMainPokemon(deckSummaries[result.deck_code]?.mainPokemon ?? []),
        )
        .filter((text) => text !== ""),
    }))
    .filter(({ decks }) => decks.length > 0);

  // 検索結果から直接開かれたとき、何のページなのかを冒頭の1文で伝える。
  // 会場・日付・優勝者・件数が入るためページごとに内容が変わり、
  // 入賞者名の羅列しか無かった本文の薄さも補える。
  const summary =
    `${date}に${event.prefecture_name}の${event.shop_name}で開催された` +
    `${event.title}（${event.league_title}リーグ / 環境『${event.environment_title}』）の結果です。` +
    (winner
      ? `優勝は${winner.player_name}選手${winnerMainPokemon ? `（${winnerMainPokemon}）` : ""}。`
      : "") +
    `入賞${cityleagueResult.results.length}名のうち、${deckCodeCount}名のデッキコードを掲載しています。`;

  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      <ScrollUpFloating />

      {/*
        SEO流入で直接開かれることが多いため、一覧への導線を先頭に置く。
        入賞者が16名並ぶと縦に長くなるので、スクロールしても常に戻れるよう sticky にする。
        top はヘッダー（fixed / h-14・lg:h-28）の直下に合わせる。
        Header と同様、iOS の standalone PWA で backdrop-blur が悪さをしないよう、
        ぼかし背景は別レイヤー（absolute）に分離する。
      */}
      <div className="sticky top-14 z-40 -mx-2 lg:top-28">
        {/* デッキ画像が裏を流れても文字が埋もれないよう、不透明度を上げ、下端に境界線を引く */}
        <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />
        <HeroLink
          as={NextLink}
          href="/cityleague_results"
          className="relative w-fit gap-0.5 px-2.5 py-2 font-bold text-tiny text-default-600"
        >
          <LuChevronLeft />
          <span>シティリーグ結果一覧</span>
        </HeroLink>
      </div>

      <Card className="w-full">
        <CardHeader className="flex-col items-start gap-2 bg-linear-to-br from-indigo-500/10 to-pink-500/10 px-3 py-3">
          {/* 両端配置 */}
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* h1 は大会名＋店舗名。店舗名だけでは「どの大会の結果か」が見出しに載らない */}
              <h1 className="flex flex-col gap-0.5">
                <span className="font-bold text-tiny text-default-400">
                  {event.title}
                </span>
                {/* 見出しの文字列として読んだとき大会名と店舗名が繋がらないよう空白を挟む(flex では描画されない) */}{" "}
                <span className="pt-0.5 font-bold text-medium leading-snug">
                  {event.shop_name}
                </span>
              </h1>
              <div className="font-bold text-tiny text-default-500">{date}</div>
            </div>

            <HeroLink
              isExternal
              href={safeExternalUrl(cityleagueResult.event_detail_result_url)}
              className="shrink-0"
            >
              <Image
                alt="公式サイトの結果ページ"
                src="https://xx8nnpgt.user.webaccel.jp/images/icons/city.png"
                radius="none"
                className="h-9 w-9 object-contain"
              />
            </HeroLink>
          </div>

          <div className="flex flex-wrap items-start gap-1">
            <Chip size="sm" radius="md" variant="bordered">
              <small className="font-bold">{event.prefecture_name}</small>
            </Chip>
            <Chip size="sm" radius="md" variant="bordered">
              <small className="font-bold">{event.league_title}リーグ</small>
            </Chip>
            <Chip size="sm" radius="md" variant="bordered">
              <small className="font-bold">『{event.environment_title}』</small>
            </Chip>
          </div>
        </CardHeader>

        <CardBody className="gap-2 px-3 py-2.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-default-500">
              <LuUsers className="shrink-0 text-small" />
              <span className="font-bold text-tiny">
                入賞 {cityleagueResult.results.length}名
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-default-500">
              <LuLayers className="shrink-0 text-small" />
              <span className="font-bold text-tiny">デッキコード {deckCodeCount}件</span>
            </div>
          </div>

          <p className="text-tiny leading-relaxed text-default-500">{summary}</p>

          {deckOverview.length > 0 && (
            <dl className="flex flex-col gap-0.5 rounded-lg bg-default-100 px-3 py-2 text-tiny">
              {deckOverview.map(({ label, decks }) => (
                <div key={label} className="flex gap-1.5">
                  <dt className="shrink-0 font-bold text-default-600">{label}</dt>
                  <dd className="text-default-500">{decks.join(" / ")}</dd>
                </div>
              ))}
            </dl>
          )}

          <HeroLink
            isExternal
            showAnchorIcon
            underline="always"
            href={safeExternalUrl(cityleagueResult.event_detail_result_url)}
            className="w-fit text-tiny"
          >
            公式サイトの結果ページを見る
          </HeroLink>
        </CardBody>
      </Card>

      {/* 順位ごとに区切ることで、同じ「ベスト16」ラベルが8枚並ぶ冗長さをなくす */}
      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-0.5">
            <span className={`h-4 w-1 shrink-0 rounded-full ${section.accent}`} />
            <h2 className="font-bold text-small">{section.label}</h2>
            <span className="text-tiny text-default-400">{section.results.length}名</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.results.map((result) => (
              <CityleagueResultCard
                key={result.player_id}
                result={result}
                date={cityleagueResult.date}
                showRankLabel={false}
                deckSummary={deckSummaries[result.deck_code]}
              />
            ))}
          </div>
        </section>
      ))}

      {relatedSection}
    </div>
  );
}
