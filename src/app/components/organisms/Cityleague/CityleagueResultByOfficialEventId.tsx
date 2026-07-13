"use client";

import NextLink from "next/link";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Link as HeroLink } from "@heroui/react";
import { Image } from "@heroui/react";

import { LuChevronLeft, LuLayers, LuUsers } from "react-icons/lu";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";

import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";

import { CityleagueResultType, Result } from "@app/types/cityleague_result";
import { OfficialEventType } from "@app/types/official_event";

type Props = {
  event: OfficialEventType;
  cityleagueResult: CityleagueResultType;
};

// 順位ごとのセクション定義。accentはカード枠線の色（CityleagueResultCard）と揃える。
const RANK_SECTIONS: { rank: number; label: string; accent: string }[] = [
  { rank: 1, label: "🥇 優勝", accent: "bg-amber-400" },
  { rank: 2, label: "🥈 準優勝", accent: "bg-default-400" },
  { rank: 3, label: "🥉 ベスト4", accent: "bg-orange-700" },
  { rank: 5, label: "ベスト8", accent: "bg-blue-500" },
  { rank: 9, label: "ベスト16", accent: "bg-default-300" },
];

type Section = {
  key: string;
  label: string;
  accent: string;
  results: Result[];
};

// 結果を順位ごとのセクションに畳む。定義外の順位も取りこぼさず「N位」として扱う。
function buildSections(results: Result[]): Section[] {
  const rest = new Map<number, Result[]>();

  for (const result of results) {
    const list = rest.get(result.rank) ?? [];
    list.push(result);
    rest.set(result.rank, list);
  }

  const sections: Section[] = [];

  for (const { rank, label, accent } of RANK_SECTIONS) {
    const matched = rest.get(rank);
    if (!matched?.length) continue;

    sections.push({ key: String(rank), label, accent, results: matched });
    rest.delete(rank);
  }

  for (const [rank, matched] of [...rest.entries()].sort((a, b) => a[0] - b[0])) {
    sections.push({
      key: String(rank),
      label: `${rank}位`,
      accent: "bg-default-300",
      results: matched,
    });
  }

  return sections;
}

// データはサーバコンポーネント側で取得済みのものを受け取る。
// ここで fetch しないことで、検索エンジンに結果本文が入ったHTMLが渡る。
export default function CityleagueResultByOfficialEventId({
  event,
  cityleagueResult,
}: Props) {
  const date = new Date(event.date).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const sections = buildSections(cityleagueResult.results);
  const deckCodeCount = cityleagueResult.results.filter(
    (result) => !!result.deck_code,
  ).length;

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
              <small className="font-bold text-tiny text-default-400">
                {event.title}
              </small>
              <div className="font-bold text-tiny text-default-500">{date}</div>
              <h1 className="pt-0.5 font-bold text-medium leading-snug">
                {event.shop_name}
              </h1>
            </div>

            <HeroLink
              isExternal
              href={cityleagueResult.event_detail_result_url}
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

          <HeroLink
            isExternal
            showAnchorIcon
            underline="always"
            href={cityleagueResult.event_detail_result_url}
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
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
