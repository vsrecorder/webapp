import type { Metadata } from "next";

// @ts-ignore: CSS module declarations not available in this environment
import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";

import Layout from "@app/components/templates/Layout";

const domain = process.env.VSRECORDER_DOMAIN;

const gaId = process.env.FIREBASE_MEASUREMENT_ID
  ? process.env.FIREBASE_MEASUREMENT_ID
  : "";

export const metadata: Metadata = {
  metadataBase: new URL(`https://` + domain),
  title: "バトレコ - ポケカ対戦記録作成・共有サービス",
  description: "ポケモンカードゲームの対戦記録を作成・共有できるWebサービス",
  openGraph: {
    url: "/",
    type: "website",
    title: "バトレコ - ポケカ対戦記録作成・共有サービス",
    images: `/images/icon.png`,
    description: "ポケモンカードゲームの対戦記録を作成・共有できるWebサービス",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    site: "@vsrecorder_mobi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="overflow-x-hidden">
        <GoogleAnalytics gaId={gaId} />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
