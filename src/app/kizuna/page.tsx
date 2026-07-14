import type { Metadata } from "next";

import { auth } from "@app/auth";

import TemplateKizuna from "@app/components/templates/Kizuna";

import { OG_SIZE, OG_SQUARE_SIZE } from "@app/utils/ogImage";

/*
 * きずなページのOGP画像はデザイン済みのPNGなので、実行時に生成せずCDNの現物を指す。
 * （satori生成やオブジェクトストレージへの自動アップロードは経由しない）
 *
 * 原本はリポジトリの public/ogp-kizuna.png / public/ogp-kizuna-square.png。
 * 生成元は assets/promo-ogp.html / assets/promo-square.html。
 * 差し替えるときは原本を書き出し直し、同じ名前でCDNへ上げること。
 */
const CDN = "https://xx8nnpgt.user.webaccel.jp/images/ogp";
const OG_IMAGE_URL = `${CDN}/ogp-kizuna.png`;
const OG_SQUARE_IMAGE_URL = `${CDN}/ogp-kizuna-square.png`;

const title = "きずな - 勝率では測れない、デッキとのきずなを数値化する";
const description =
  "勝率は、そのデッキが強かったかを語る。きずなは、そのデッキとどう歩んできたかを語る。負けても使い続けた回数、組み直した夜、連れて行った大会。対戦記録から「きずなLv.」を算出する新機能、近日公開。";
const alt =
  "勝率は、そのデッキが強かったかを語る。きずなは、そのデッキとどう歩んできたかを語る。";

export const metadata: Metadata = {
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
    /*
     * 横長（1200×630）を先頭に置く。主要なクライアントは先頭の画像を使うため、
     * カードは全幅バナーになる。正方形（1200×1200）は候補として後ろに並べ、
     * 正方形を好むクライアント（summary 表示）に拾わせる。
     */
    images: [
      { url: OG_IMAGE_URL, ...OG_SIZE, alt },
      { url: OG_SQUARE_IMAGE_URL, ...OG_SQUARE_SIZE, alt },
    ],
    locale: "ja_JP",
    siteName: "バトレコ",
  },
  twitter: {
    // Xは全幅バナー。twitter:image に横長を明示して、正方形に落ちないようにする。
    card: "summary_large_image",
    site: "@vsrecorder_mobi",
    title,
    description,
    images: [OG_IMAGE_URL],
  },
};

// 非会員も閲覧できる公開ページ。
// auth() はアクセス制限のためではなく、会員／非会員で出し分けるために呼ぶ。
// 会員には登録済みデッキの実データからきずなLv.を算出し、非会員には質問で試算させる。
export default async function Page() {
  const session = await auth();

  return <TemplateKizuna userId={session?.user?.id ?? null} />;
}
