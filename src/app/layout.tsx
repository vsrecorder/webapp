import type { Metadata } from "next";

import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";

import Layout from "@app/components/templates/Layout";

const domain = process.env.VSRECORDER_DOMAIN;

const gaId = process.env.FIREBASE_MEASUREMENT_ID
  ? process.env.FIREBASE_MEASUREMENT_ID
  : "";

export const metadata: Metadata = {
  metadataBase: new URL(`https://` + domain),
  title: "バトレコ",
  description: "ポケカプレイヤーのための対戦記録サービス",
  openGraph: {
    url: "/",
    type: "website",
    title: "バトレコ - ポケカプレイヤーのための対戦記録サービス",
    images: `https://xx8nnpgt.user.webaccel.jp/images/icons/icon.png`,
    description: "ポケカプレイヤーのための対戦記録サービス",
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
    <html lang="ja" suppressHydrationWarning>
      <body className="overflow-x-hidden bg-white text-foreground dark:bg-neutral-950">
        <GoogleAnalytics gaId={gaId} />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
