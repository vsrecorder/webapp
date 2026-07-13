import type { Metadata } from "next";

import { auth } from "@app/auth";

import TemplateKizuna from "@app/components/templates/Kizuna";

import { loadKizunaOgImage, OG_SIZE } from "@app/utils/ogImage";
import { ensureOgImage } from "@app/utils/ogStorage";

const title = "きずな - 勝率では測れない、デッキとのきずなを数値化する";
const description =
  "勝率は、そのデッキが強かったかを語る。きずなは、そのデッキとどう歩んできたかを語る。負けても使い続けた回数、組み直した夜、連れて行った大会。対戦記録から「きずなレベル」を算出する新機能、近日公開。";
const alt =
  "勝率は、そのデッキが強かったかを語る。きずなは、そのデッキとどう歩んできたかを語る。";

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = await ensureOgImage("kizuna", loadKizunaOgImage);

  return {
    title,
    description,
    alternates: {
      canonical: "/kizuna",
    },
    openGraph: {
      url: "/kizuna",
      type: "website",
      title,
      description,
      images: ogImageUrl ? [{ url: ogImageUrl, ...OG_SIZE, alt }] : undefined,
      locale: "ja_JP",
      siteName: "バトレコ",
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

// 非会員も閲覧できる公開ページ。
// auth() はアクセス制限のためではなく、会員／非会員で出し分けるために呼ぶ。
// 会員には登録済みデッキの実データからきずなレベルを算出し、非会員には質問で試算させる。
export default async function Page() {
  const session = await auth();

  return <TemplateKizuna userId={session?.user?.id ?? null} />;
}
