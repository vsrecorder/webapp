import Link from "next/link";

import { Card, CardBody, CardHeader, Chip, Link as HeroLink } from "@heroui/react";

import { LuChevronLeft, LuLayers, LuUsers } from "react-icons/lu";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";

import {
  ChampionsleagueEventResultType,
  ChampionsleagueResult,
} from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { DeckSummaryType } from "@app/types/deckcard";
import { OfficialEventType } from "@app/types/official_event";

import { championsleagueLeagueTitle } from "@app/utils/championsleague";
import { formatEventDate, formatTermRange } from "@app/utils/cityleague";
import { buildRankSections } from "@app/utils/cityleagueRank";
import { formatMainPokemon } from "@app/utils/deckSummary";
import { safeExternalUrl } from "@app/utils/url";

type Props = {
  schedule: ChampionsleagueScheduleType;
  leagueType: number;
  // このリーグ区分の結果。区分は通常1イベント(1日)だが、Day1/Day2 に分かれた場合に
  // 取りこぼさないよう配列で受ける。
  eventResults: ChampionsleagueEventResultType[];
  // official_events から引いた大会名・会場。取れなかったイベントは含まれない。
  officialEvents: Record<number, OfficialEventType>;
  // デッキコードごとのカード内訳の要約(サーバ側で取得済み)。
  deckSummaries?: Record<string, DeckSummaryType>;
  // 同じ大会の他区分・他大会へのリンク。サーバコンポーネントのまま受け取るため props で差し込む。
  relatedSection?: React.ReactNode;
};

/**
 * イベントの見出し。
 *
 * official_events の大会名は「チャンピオンズリーグ2026 大阪 マスターリーグDay2」のように
 * 大会名を先頭に含む。ページの h1 と重複するので、その部分は落として区分だけを見出しにする。
 * official_events が引けなかったときは league_type から組み立てる。
 */
export function buildEventHeading(
  schedule: ChampionsleagueScheduleType,
  eventResult: ChampionsleagueEventResultType,
  officialEvent?: OfficialEventType,
): string {
  const leagueTitle = championsleagueLeagueTitle(eventResult.league_type);
  const fallback = leagueTitle ? `${leagueTitle}リーグ` : "結果";

  if (!officialEvent?.title) return fallback;

  // championsleague_schedules.title には末尾に空白を持つものがある(cl2025_aichi)
  const prefix = schedule.title.trim();
  const title = officialEvent.title.trim();

  if (title.startsWith(prefix)) {
    const rest = title.slice(prefix.length).trim();

    return rest === "" ? fallback : rest;
  }

  return title;
}

function findWinner(results: ChampionsleagueResult[]): ChampionsleagueResult | undefined {
  return results.find((result) => result.rank === 1);
}

// 「優勝は○○デッキ（△△選手）」。デッキの内訳が取れなかったときは選手名だけにする。
export function formatChampionsleagueWinner(
  winner: ChampionsleagueResult,
  deckSummaries: Record<string, DeckSummaryType>,
): string {
  const mainPokemon = formatMainPokemon(
    deckSummaries[winner.deck_code]?.mainPokemon ?? [],
  );

  return mainPokemon
    ? `${mainPokemon}デッキ（${winner.player_name}選手）`
    : `${winner.player_name}選手`;
}

/**
 * リーグ区分ごとの結果ページ本体。
 *
 * 大会単位で1ページにまとめると入賞者が最大64名になり、マスターだけを見に来た人にも
 * 全区分のデッキ画像を読み込ませることになるため、区分ごとにページを分けている。
 *
 * データはサーバコンポーネント側で取得済みのものを受け取る。ここで fetch しないことで、
 * 検索エンジンに入賞者・デッキの内訳が入ったHTMLがそのまま渡る。
 */
export default function ChampionsleagueResultByLeague({
  schedule,
  leagueType,
  eventResults,
  officialEvents,
  deckSummaries = {},
  relatedSection,
}: Props) {
  const scheduleTitle = schedule.title.trim();
  const leagueTitle = championsleagueLeagueTitle(leagueType);

  const resultCount = eventResults.reduce(
    (total, eventResult) => total + eventResult.results.length,
    0,
  );
  const deckCodeCount = eventResults.reduce(
    (total, eventResult) =>
      total + eventResult.results.filter((result) => !!result.deck_code).length,
    0,
  );

  // 会場は official_events にしか無い。イベントごとに同じ値が入るため、引けた最初のものを使う。
  const venue = eventResults
    .map((eventResult) => officialEvents[eventResult.official_event_id]?.venue)
    .find((value) => !!value);

  // 検索結果から直接開かれたとき、何のページなのかを冒頭の1文で伝える。
  const winner = findWinner(eventResults.flatMap((eventResult) => eventResult.results));
  const summary =
    `${formatTermRange(schedule)}に${venue ? `${venue}で` : ""}開催された${scheduleTitle}` +
    `${leagueTitle ? `（${leagueTitle}リーグ）` : ""}の結果です。` +
    (winner ? `優勝は${formatChampionsleagueWinner(winner, deckSummaries)}。` : "") +
    `入賞${resultCount}名のうち、${deckCodeCount}名のデッキコードとカードリストを掲載しています。`;

  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      <ScrollUpFloating />

      {/*
        SEO流入で直接開かれることが多いため、大会ページへの導線を先頭に置く。
        入賞者が16名並んで縦に長くなるので、スクロールしても常に戻れるよう sticky にする。
        top はヘッダー(fixed / h-14・lg:h-28)の直下に合わせる。
      */}
      <div className="sticky top-14 z-40 -mx-2 lg:top-28">
        {/* デッキ画像が裏を流れても文字が埋もれないよう、不透明度を上げ、下端に境界線を引く */}
        <div className="absolute inset-0 border-b border-default-200/60 bg-white/90 backdrop-blur-md dark:bg-neutral-950/90" />
        {/* HeroUI の Link に as={NextLink} を渡すとサーバコンポーネントから
            「関数はクライアントコンポーネントへ渡せない」で描画に失敗するため、
            ここは素の next/link を同じ見た目のクラスで使う。 */}
        <Link
          href={`/cityleague_results/championsleagues/${schedule.id}`}
          className="relative flex w-fit items-center gap-0.5 px-2.5 py-2 font-bold text-tiny text-primary"
        >
          <LuChevronLeft />
          <span className="truncate">{scheduleTitle}</span>
        </Link>
      </div>

      <Card className="w-full">
        <CardHeader className="flex-col items-start gap-2 bg-linear-to-br from-indigo-500/10 to-pink-500/10 px-3 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-bold text-tiny text-primary">CHAMPIONS LEAGUE</span>
            {/* h1 は大会名＋リーグ区分。区分ごとにページが分かれるため、
                見出しだけでどの区分の結果かが分かるようにする。 */}
            <h1 className="flex flex-col gap-0.5">
              <span className="font-bold text-tiny text-default-400">
                {scheduleTitle}
              </span>
              {/* 見出しの文字列として読んだとき大会名と区分が繋がらないよう空白を挟む(flex では描画されない) */}{" "}
              <span className="pt-0.5 font-bold text-medium leading-snug">
                {leagueTitle ? `${leagueTitle}リーグ` : "結果"}
              </span>
            </h1>
            <div className="font-bold text-tiny text-default-500">
              {formatTermRange(schedule)}
            </div>
          </div>

          {venue && (
            <div className="flex flex-wrap items-start gap-1">
              <Chip size="sm" radius="md" variant="bordered">
                <small className="font-bold">{venue}</small>
              </Chip>
            </div>
          )}
        </CardHeader>

        <CardBody className="gap-2 px-3 py-2.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-default-500">
              <LuUsers className="shrink-0 text-small" />
              <span className="font-bold text-tiny">入賞 {resultCount}名</span>
            </div>
            <div className="flex items-center gap-1.5 text-default-500">
              <LuLayers className="shrink-0 text-small" />
              <span className="font-bold text-tiny">デッキコード {deckCodeCount}件</span>
            </div>
          </div>

          <p className="text-tiny leading-relaxed text-default-500">{summary}</p>
        </CardBody>
      </Card>

      {eventResults.map((eventResult) => {
        const heading = buildEventHeading(
          schedule,
          eventResult,
          officialEvents[eventResult.official_event_id],
        );
        const sections = buildRankSections(eventResult.results);

        return (
          <section
            key={eventResult.official_event_id}
            className="flex flex-col gap-2 pt-2"
          >
            {/* 開催日と公式サイトへの導線。Day1/Day2 に分かれた区分では
                どちらのイベントかもここで分かるようにする。 */}
            <Card shadow="sm" className="w-full">
              <CardBody className="gap-1 px-3 py-2.5">
                <h2 className="font-bold text-small leading-snug">{heading}</h2>
                <div className="text-tiny text-default-500">
                  {formatEventDate(eventResult.date)} / 入賞{" "}
                  {eventResult.results.length}名
                </div>
                <HeroLink
                  isExternal
                  showAnchorIcon
                  underline="always"
                  href={safeExternalUrl(eventResult.event_detail_result_url)}
                  className="w-fit text-tiny"
                >
                  公式サイトの結果ページを見る
                </HeroLink>
              </CardBody>
            </Card>

            {/* 順位ごとに区切ることで、同じ「ベスト16」ラベルが8枚並ぶ冗長さをなくす */}
            {sections.map((section) => (
              <section
                key={`${eventResult.official_event_id}-${section.key}`}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 px-0.5">
                  <span className={`h-4 w-1 shrink-0 rounded-full ${section.accent}`} />
                  <h3 className="font-bold text-small">{section.label}</h3>
                  <span className="text-tiny text-default-400">
                    {section.results.length}名
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.results.map((result) => (
                    <CityleagueResultCard
                      key={`${eventResult.official_event_id}-${result.player_id}`}
                      result={result}
                      date={eventResult.date}
                      showRankLabel={false}
                      deckSummary={deckSummaries[result.deck_code]}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        );
      })}

      {relatedSection}
    </div>
  );
}
