import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LuCalendar, LuChevronRight } from "react-icons/lu";

import CityleagueDateShareButtons from "@app/components/molecules/CityleagueDateShareButtons";
import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import { formatMonthKey, getCityleagueEventsInTerm } from "@app/utils/cityleague";
import { dateParamToMonthKey, formatDateParam, parseDateParam } from "@app/utils/cityleagueDate";
import { getDateWinnerDecks } from "@app/utils/cityleagueDateWinnersServer";
import { OG_SIZE, renderCityleagueDateOgImage } from "@app/utils/ogImage";
import { ogImageUrlFor } from "@app/utils/ogStorage";

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
   */
  const ogImageUrl =
    events.length > 0
      ? ogImageUrlFor(`cityleague_results/dates/${dateParam}-n${events.length}`, async () =>
          renderCityleagueDateOgImage(dateLabel, await getDateWinnerDecks(events), events.length),
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
          actions={<CityleagueDateShareButtons dateParam={dateParam} dateLabel={dateLabel} />}
        />

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
