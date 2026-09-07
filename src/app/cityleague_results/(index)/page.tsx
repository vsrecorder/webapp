import { Suspense } from "react";

import type { Metadata } from "next";
import { cookies } from "next/headers";

import CityleagueBrowseSection from "@app/components/organisms/Cityleague/CityleagueBrowseSection";
import CityleagueLatestSection from "@app/components/organisms/Cityleague/CityleagueLatestSection";
import TemplateCityleagueResults from "@app/components/templates/CityleagueResults";

import {
  CITYLEAGUE_SELECTED_TAB_COOKIE,
  DEFAULT_CITYLEAGUE_TAB,
  cityleagueTabToLeagueType,
  parseCityleagueTab,
} from "@app/utils/cityleagueListPrefs";
import { getCityleagueListInitialData } from "@app/utils/cityleagueListServer";
import { OG_SIZE, renderCityleagueListOgImage } from "@app/utils/ogImage";
import { ensureOgImage } from "@app/utils/ogStorage";

const title = "シティリーグ結果・優勝デッキ一覧";
const description =
  "全国のシティリーグの結果を日付順に掲載しています。優勝からベスト16までの入賞者のデッキコードとカードリスト、優勝デッキの主なポケモンを、オープン／ジュニア／シニアのリーグ区分ごとに確認できます。";

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
  /*
   * 選択中タブは cookie に保存されている(cityleagueListPrefs)。サーバ描画の時点で
   * そのタブで描き、ハイドレーション後に一覧が切り替わって見えないようにする。
   */
  const store = await cookies();
  const tab =
    parseCityleagueTab(store.get(CITYLEAGUE_SELECTED_TAB_COOKIE)?.value) ??
    DEFAULT_CITYLEAGUE_TAB;

  /*
   * そのタブの1ページ目をサーバで取って HTML に載せる(記録一覧・デッキ一覧と同じ型)。
   *
   * これまではブラウザ側がハイドレーションを待ってから
   * スケジュール →(開催期間外ならスケジュール全件)→ 結果 → その日の公式イベント と
   * 直列に往復していたため、最初のカードが出るまで実測で 2.9 秒かかっていた。
   * 取れなかった場合(null)は、これまでどおりブラウザ側が取り直す。
   */
  const initial = await getCityleagueListInitialData(cityleagueTabToLeagueType(tab));

  return (
    <TemplateCityleagueResults
      initial={initial}
      initialTab={tab}
      browseSection={<CityleagueBrowseSection />}
      // CityleagueLatestSection は core-apiserver へ2往復する（全イベント一覧 → 期間内のイベント）。
      // Suspense で包まないとこのページ全体がその往復を待ってから描画されるため、
      // loading.tsx の骨格からタブ・一覧へ切り替わるのがまるごと遅れる。
      // ページ末尾のリンク集で初期表示に要らないので、後から流し込む。
      // events が0件のとき自身が null を返す作りなので、fallback も同じく何も出さない。
      //
      // key はこの Suspense を配列の要素として識別させるためのもの。クライアント
      // コンポーネントへ props で渡した Suspense は、遅れて解決したぶんが key の無い
      // 配列として差し込まれ「Each child in a list should have a unique key prop」が
      // 開発時に出る(実測で発生源をここまで絞った。Tabs は無関係)。付けると出なくなる。
      latestSection={
        <Suspense key="latest" fallback={null}>
          <CityleagueLatestSection />
        </Suspense>
      }
    />
  );
}
