import type { Metadata } from "next";

import CityleagueBrowseSection from "@app/components/organisms/Cityleague/CityleagueBrowseSection";
import TemplateCityleagueResults from "@app/components/templates/CityleagueResults";

import { OG_SIZE, renderCityleagueListOgImage } from "@app/utils/ogImage";
import { ensureOgImage } from "@app/utils/ogStorage";

const title = "シティリーグ結果・優勝デッキ一覧";
const description =
  "全国のシティリーグの結果を日付順に掲載しています。優勝からベスト16までの入賞者のデッキコードを、オープン／ジュニア／シニアのリーグ区分ごとに確認できます。";

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = await ensureOgImage(
    "cityleague_results",
    renderCityleagueListOgImage,
  );

  return {
    title,
    description,
    alternates: {
      canonical: "/cityleague_results",
    },
    openGraph: {
      url: "/cityleague_results",
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

export default async function Page() {
  return <TemplateCityleagueResults browseSection={<CityleagueBrowseSection />} />;
}
