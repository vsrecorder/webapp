import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Chip } from "@heroui/react";
import { LuCalendar, LuChevronRight } from "react-icons/lu";

import CityleagueHubShareButtons from "@app/components/molecules/CityleagueHubShareButtons";
import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  countEventsByLeagueTitle,
  formatMonthKey,
  getCityleagueEventsInTerm,
} from "@app/utils/cityleague";
import { dateParamToMonthKey, formatDateParam, parseDateParam } from "@app/utils/cityleagueDate";
import { getDateWinnerDecks } from "@app/utils/cityleagueDateWinnersServer";
import { OG_SIZE, renderCityleagueDateOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

/*
 * 開催日の OGP 画像のキーの改訂番号。集計の仕方を直して、既に置いた画像を作り直させたいときに上げる。
 * 2: 分類の取り込み待ちの間に描いて優勝デッキが欠けた画像を作り直す(2026-09-28 など)
 */
const DATE_OG_REVISION = 2;

type Props = {
  params: Promise<{
    date: string;
  }>;
};

// 見出しは「の」の後ろで改行して見せる(CityleagueHubHeader の titleLines)。
// 1行のタイトル(<title>・OGP)は各行をつないだもの
function buildTitleLines(dateLabel: string): string[] {
  return [`${dateLabel}の`, "シティリーグ入賞デッキ一覧"];
}

function buildTitle(dateLabel: string): string {
  return buildTitleLines(dateLabel).join("");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const dateParam = parseDateParam(date);

  if (!dateParam) {
    return { title: "シティリーグ結果" };
  }

  const dateLabel = formatDateParam(dateParam);
  const title = buildTitle(dateLabel);
  const description = `${dateLabel}に開催された全国のシティリーグの結果一覧です。店舗ごとに、優勝からベスト16までの入賞者のデッキコードを掲載しています。`;
  const path = `/cityleague_results/dates/${dateParam}`;

  // 形式さえ合えばどの日でも URL になるため、結果のある日だけ画像を作る
  // (存在しない日の URL を叩かれるたびに、ストレージへ画像を置かせないため)。
  // 本文と同じ取得なので、同じ描画の中では1回しか取りに行かない(メモ化)。
  const events = await getCityleagueEventsInTerm(dateParam, dateParam);
  /*
   * 画像にはその日の優勝デッキ(デッキ分類ごとの優勝回数)を載せる。結果は開催日のあとに
   * 少しずつ登録されるので、大会数をキーに含めて、増えたら新しい画像を作らせる
   * (画像は一度置いたら作り直さないため。ogStorage)。優勝デッキの集計は画像を作るときにだけ走る。
   *
   * 分類(バトラボの索引)は結果の登録より遅れるので、まだ分類の無い優勝デッキがあるうちは描かずに
   * 待つ(null。ogStorage が数分おきに描き直す)。待ちきれないとき(giveUp)は手元の分で描く。
   */
  const ogImageUrl =
    events.length > 0
      ? ogImageUrlFor(
          `cityleague_results/dates/${dateParam}-n${events.length}-r${DATE_OG_REVISION}`,
          async ({ giveUp }) => {
            const { winners, pending } = await getDateWinnerDecks(events);
            if (pending > 0 && !giveUp) return null;
            return renderCityleagueDateOgImage(dateLabel, winners, events.length);
          },
        )
      : null;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      type: "website",
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
  const { date } = await params;
  const dateParam = parseDateParam(date);

  if (!dateParam) {
    notFound();
  }

  // 開催月ページと同じく、結果が登録された会場を並べる(店舗名・都道府県・リーグ区分、個別ページへのリンク)
  const events = await getCityleagueEventsInTerm(dateParam, dateParam);

  // 結果の無い日(開催が無い日・まだ登録されていない日)のページをインデックスさせないため、404 にする
  if (events.length === 0) {
    notFound();
  }

  const dateLabel = formatDateParam(dateParam);
  const monthKey = dateParamToMonthKey(dateParam);
  const leagueCounts = countEventsByLeagueTitle(events);

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "開催日から探す", path: "/cityleague_results/dates" },
    { name: dateLabel, path: `/cityleague_results/dates/${dateParam}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results/dates"
          backLabel="開催日から探す"
          eyebrow="DATE"
          title={buildTitle(dateLabel)}
          titleLines={buildTitleLines(dateLabel)}
          count={events.length}
          actions={
            <CityleagueHubShareButtons
              path={`/cityleague_results/dates/${dateParam}`}
              title={buildTitle(dateLabel)}
              utmCampaign="cityleague_date"
            />
          }
        />

        {/* 合計件数だけでは各リーグの開催規模が分からないため、区分ごとの開催数を添える */}
        <div className="flex flex-wrap gap-1.5">
          {leagueCounts.map((item) => (
            <Chip key={item.leagueTitle} size="sm" radius="md" variant="bordered">
              <small className="font-bold">
                {item.leagueTitle}リーグ {item.count}件
              </small>
            </Chip>
          ))}
        </div>

        <CityleagueEventLinkList events={events} showDateLink={false} />

        {/* 同じ月の他の開催日へ横に辿れるよう、開催月のページへ繋ぐ */}
        <Link
          href={`/cityleague_results/months/${monthKey}`}
          className="flex items-center justify-between gap-2 rounded-2xl border border-default-100 bg-content1 px-3 py-3 hover:bg-default-50"
        >
          <span className="flex items-center gap-2 font-bold text-small">
            <LuCalendar className="text-primary" />
            {formatMonthKey(monthKey)}のシティリーグ結果
          </span>
          <LuChevronRight className="shrink-0 text-default-300" />
        </Link>
      </div>
    </>
  );
}
