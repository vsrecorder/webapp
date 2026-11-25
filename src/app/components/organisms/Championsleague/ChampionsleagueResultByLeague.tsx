import { Card, CardBody, CardHeader, Chip, Link as HeroLink } from "@heroui/react";

import { LuLayers, LuUsers } from "react-icons/lu";

import ScrollUpFloating from "@app/components/atoms/Floating/ScrollUpFloating";
import BackLink from "@app/components/molecules/BackLink";
import PinnedBar from "@app/components/molecules/PinnedBar";
import { CHAMPIONSLEAGUE_RESULT_BAR_CLASS } from "@app/components/organisms/Championsleague/championsleagueResultBar";
import CityleagueResultCard from "@app/components/organisms/Cityleague/CityleagueResultCard";

import {
  ChampionsleagueEventResultType,
  ChampionsleagueResult,
} from "@app/types/championsleague_result";
import { ChampionsleagueScheduleType } from "@app/types/championsleague_schedule";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import { DeckSummaryType } from "@app/types/deckcard";
import { OfficialEventType } from "@app/types/official_event";

import { championsleagueLeagueTitle } from "@app/utils/championsleague";
import { formatEventDate, formatEventMonthDay, formatTermRange } from "@app/utils/cityleague";
import { buildRankSections } from "@app/utils/cityleagueRank";
import { deckDisplayName, isDeckArchetypeChampionsleague } from "@app/utils/deckArchetype";
import { safeExternalUrl } from "@app/utils/url";

type Props = {
  schedule: ChampionsleagueScheduleType;
  leagueType: number;
  // このリーグ区分の結果。区分は通常1イベント(1日)だが、1日目/2日目に分かれた場合に
  // 取りこぼさないよう配列で受ける。開催日の古い順で渡すこと(表示も要約もその順に従う)。
  eventResults: ChampionsleagueEventResultType[];
  // official_events から引いた大会名・会場。取れなかったイベントは含まれない。
  officialEvents: Record<number, OfficialEventType>;
  // デッキコードごとのカード内訳の要約(サーバ側で取得済み)。
  deckSummaries?: Record<string, DeckSummaryType>;
  // デッキコードごとの種類(バトラボのデッキ分類。2027 シーズン以降の大会だけ)。無いデッキは種類の行を出さない
  deckArchetypes?: DeckArchetypeMap;
  // 同じ大会の他区分・他大会へのリンク。サーバコンポーネントのまま受け取るため props で差し込む。
  relatedSection?: React.ReactNode;
};

/**
 * イベントの見出し。
 *
 * official_events の大会名は「チャンピオンズリーグ2026 大阪 マスターリーグDay2」のように
 * 大会名を先頭に含む。ページの h1 と重複するので、その部分は落として区分だけを見出しにする。
 * 末尾に付くことのある【2026年3月28日（土）開催】も、見出しのすぐ下に開催日を出すので落とす。
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
  const title = officialEvent.title.replace(/【[^】]*開催】/g, "").trim();

  if (title.startsWith(prefix)) {
    const rest = title.slice(prefix.length).trim();

    return rest === "" ? fallback : rest;
  }

  return title;
}

/**
 * 同じ区分に複数のイベントがあるとき、イベント同士を見分けるための短い呼び名。
 *
 * 見出し(buildEventHeading)から、どのイベントにも共通する区分名を落とす。
 *   「シニアリーグ 1日目大会」→「1日目大会」
 *   「マスターリーグ グループA」→「グループA」
 * 区分名しか残らないとき(official_events が引けなかったときなど)は開催日の月日で呼ぶ。
 */
export function buildEventLabel(
  heading: string,
  eventResult: Pick<ChampionsleagueEventResultType, "league_type" | "date">,
): string {
  const leagueTitle = championsleagueLeagueTitle(eventResult.league_type);

  const prefix = leagueTitle ? `${leagueTitle}リーグ` : "";
  const label = heading.startsWith(prefix) ? heading.slice(prefix.length).trim() : heading;

  return label === "" || label === "結果" ? formatEventMonthDay(eventResult.date) : label;
}

// 「△△選手（デッキ分類名）」。シティリーグの個別ページの冒頭文と同じ形にする。
// デッキの呼び名はデッキ分類の名前を優先し、無ければ主なポケモン(deckDisplayName)。
// 入賞カードに出る種類と食い違わないようにする。どちらも取れなかったときは選手名だけにする。
export function formatChampionsleagueWinner(
  winner: ChampionsleagueResult,
  deckSummaries: Record<string, DeckSummaryType>,
  deckArchetypes: DeckArchetypeMap = {},
): string {
  const deckName = deckDisplayName(
    deckArchetypes[winner.deck_code],
    deckSummaries[winner.deck_code],
  );

  return deckName ? `${winner.player_name}選手（${deckName}）` : `${winner.player_name}選手`;
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
  deckArchetypes = {},
  relatedSection,
}: Props) {
  const scheduleTitle = schedule.title.trim();
  const leagueTitle = championsleagueLeagueTitle(leagueType);

  // デッキの種類が付く大会か。デッキコードの無い入賞にも unknown の 2 枠と「デッキコード未掲載」を
  // 出し、他の入賞と同じ形にする(骨格の loading.tsx と同じ判定)
  const withDeckArchetype = isDeckArchetypeChampionsleague(schedule.id);

  // 1日目大会/2日目大会のように、別々の大会が1ページに並ぶ区分か。どちらも優勝〜ベスト16の
  // 同じ並びなので、境目と「今どちらを見ているか」が分かる見せ方に切り替える
  const hasMultipleEvents = eventResults.length > 1;

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
  // 1日目/2日目に分かれた区分には優勝が2人いるので、代表として最終日のほうを載せる。
  const winner = eventResults[eventResults.length - 1]?.results.find(
    (result) => result.rank === 1,
  );
  const summary =
    `${formatTermRange(schedule)}に${venue ? `${venue}で` : ""}開催された${scheduleTitle}` +
    `${leagueTitle ? `（${leagueTitle}リーグ）` : ""}の結果です。` +
    (winner
      ? `優勝は${formatChampionsleagueWinner(winner, deckSummaries, deckArchetypes)}。`
      : "") +
    `入賞${resultCount}名のうち、${deckCodeCount}名のデッキコードとカードリストを掲載しています。`;

  return (
    // 上の余白(旧 pt-1)は先頭の固定バーの中身(pt-3 = 旧 pt-1 + py-2)が持つ
    <div className="flex flex-col gap-3 pb-3">
      <ScrollUpFloating />

      {/*
        SEO流入で直接開かれることが多いため、大会ページへの導線を先頭に置く。
        入賞者が16名並んで縦に長くなるので、スクロールしても常に戻れるようヘッダーの直下に
        固定する(PinnedBar。sticky にしない理由はそちら)。PinnedBar はクライアントの入れ物で、
        中の BackLink はサーバコンポーネントのまま(next/link)HTML に載る。
      */}
      <PinnedBar className={CHAMPIONSLEAGUE_RESULT_BAR_CLASS}>
        <BackLink href={`/cityleague_results/championsleagues/${schedule.id}`} label={scheduleTitle} />
      </PinnedBar>

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

      {eventResults.map((eventResult, eventIndex) => {
        const heading = buildEventHeading(
          schedule,
          eventResult,
          officialEvents[eventResult.official_event_id],
        );
        const eventLabel = hasMultipleEvents ? buildEventLabel(heading, eventResult) : null;
        const sections = buildRankSections(eventResult.results);

        return (
          <section
            key={eventResult.official_event_id}
            // 2つ目以降は前のイベントの最後のカードから大きく離し、別の大会だと分かるようにする
            className={`flex flex-col gap-2 ${eventIndex === 0 ? "pt-2" : "pt-10"}`}
          >
            {/* 開催日と公式サイトへの導線。Day1/Day2 に分かれた区分では
                どちらのイベントかもここで分かるようにする。
                そのとき見出しが入賞カードと同じ白いカードだと、16枚並んだカードに埋もれて
                境目に気づけないので、塗りの帯にする(順位の枠色に無い色)。
                文字の大きさを変えても行の高さは変えず、骨格(loading.tsx)と高さを揃えておく。
                クラスは HeroUI の cn で繋がない(text-tiny と text-white/90 を同じ種類とみなして
                text-tiny を落とし、文字が大きくなる)。 */}
            <Card
              shadow="sm"
              className={`w-full ${hasMultipleEvents ? "bg-indigo-600 text-white" : ""}`}
            >
              <CardBody className="gap-1 px-3 py-2.5">
                <h2
                  className={`font-bold ${
                    hasMultipleEvents ? "text-medium leading-5" : "text-small leading-snug"
                  }`}
                >
                  {heading}
                </h2>
                <div
                  className={`text-tiny ${
                    hasMultipleEvents ? "text-white/90" : "text-default-500"
                  }`}
                >
                  {formatEventDate(eventResult.date)} / 入賞{" "}
                  {eventResult.results.length}名
                </div>
                <HeroLink
                  isExternal
                  showAnchorIcon
                  underline="always"
                  href={safeExternalUrl(eventResult.event_detail_result_url)}
                  className={`w-fit text-tiny ${hasMultipleEvents ? "text-white" : ""}`}
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
                  {/* 見出しの帯が画面の外にあっても、どの大会の順位かが分かるようにする */}
                  {eventLabel && (
                    <span className="ml-auto truncate rounded-full bg-indigo-600 px-2 py-0.5 font-bold text-[0.6875rem] leading-4 text-white">
                      {eventLabel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {section.results.map((result) => (
                    <CityleagueResultCard
                      key={`${eventResult.official_event_id}-${result.player_id}`}
                      result={result}
                      date={eventResult.date}
                      showRankLabel={false}
                      deckSummary={deckSummaries[result.deck_code]}
                      deckArchetype={deckArchetypes[result.deck_code]}
                      withDeckArchetype={withDeckArchetype}
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
