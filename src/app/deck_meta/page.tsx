import type { Metadata } from "next";

import TemplateDeckMeta from "@app/components/templates/DeckMeta";

import {
  deckMetaRankingOgImageUrl,
  deckMetaTrendOgImageUrl,
} from "@app/utils/deckMetaOg";
import {
  normalizeDeckUsageGrouping,
  UI_DEFAULT_DECK_USAGE_GROUPING,
} from "@app/utils/deckUsageGrouping";
import { OG_SIZE } from "@app/utils/ogImage";
import {
  currentWeekValue,
  generateWeekOptions,
  lastWeekValue,
  sundayOfWeekValue,
  weekRangeLabel,
} from "@app/utils/week";
import { trendRangeFromQuery, trendWeekCount } from "@app/utils/weeklyDeckUsageTrend";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  searchParams: Promise<SearchParams>;
};

const TITLE = "対戦環境分析（週次デッキ使用率）";
const DESCRIPTION =
  "バトレコの対戦記録から集計した、週ごとのポケモンカード対戦環境のデッキ使用率です（β機能）。";

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

// "2026-09-14" → "9/14"
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

/*
 * SNS でシェアされたときのカード(og:*)は、表示中のタブと週・期間に合わせる。
 * URL の値は画面(ランキングの週セレクタ・推移の期間)と同じ規則で検証してから使い、
 * 画面で選べない値は画面と同じく既定へ寄せる(OGP 画像のキーにもなるため、
 * 任意の値を受け付けると画像を際限なく作らせられる)。
 *
 * 検索結果に出すページは1つなので、canonical はどの表示でも /deck_meta のまま。
 * og:url だけ表示中の状態(view・週・期間)を持たせ、シェアした先で同じ表示を開けるようにする。
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const currentWeek = currentWeekValue();

  let title: string;
  let description: string;
  let query: URLSearchParams;
  let ogImageUrl: string | null;

  if (first(params.view) === "trend") {
    const range = trendRangeFromQuery(first(params.from), first(params.to), currentWeek);
    const rangeLabel = `${shortDate(range.from)}〜${shortDate(sundayOfWeekValue(range.to))}`;

    title = `使用率順位の推移（${rangeLabel}）`;
    description = `バトレコの対戦記録から集計した、デッキ使用率ランキングの順位の推移です（${rangeLabel}の${trendWeekCount(range)}週）。1体目のポケモンでまとめた集計の上位30位を週ごとに線でつないでいます。`;
    query = new URLSearchParams({ view: "trend", from: range.from, to: range.to });
    ogImageUrl = deckMetaTrendOgImageUrl(range);
  } else {
    // ランキングの週セレクタと同じく、選べる週(今週を含む直近12週)以外は先週にする
    const weekParam = first(params.week);
    const week =
      weekParam && generateWeekOptions(12).some((o) => o.value === weekParam)
        ? weekParam
        : lastWeekValue();
    const grouping = normalizeDeckUsageGrouping(
      first(params.grouping),
      UI_DEFAULT_DECK_USAGE_GROUPING,
    );

    title = `デッキ使用率ランキング（${weekRangeLabel(week)}の週）`;
    description = DESCRIPTION;
    query = new URLSearchParams({ week, grouping });
    ogImageUrl = deckMetaRankingOgImageUrl(week, grouping);
  }

  const url = `/deck_meta?${query.toString()}`;

  return {
    // タブのタイトル・検索結果の見出しは従来どおり。表示中の週・期間はカードにだけ出す
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: "/deck_meta",
    },
    openGraph: {
      url,
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

// 非会員も閲覧できる公開ページのため、auth() は呼ばない。
export default async function Page() {
  return <TemplateDeckMeta />;
}
