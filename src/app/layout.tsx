import type { Metadata } from "next";

import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";

import Layout from "@app/components/templates/Layout";
import { getAppIconUrl, isDevEnv } from "@app/utils/appIcon";

const domain = process.env.VSRECORDER_DOMAIN;

const gaId = process.env.FIREBASE_MEASUREMENT_ID
  ? process.env.FIREBASE_MEASUREMENT_ID
  : "";

export const metadata: Metadata = {
  metadataBase: new URL(`https://` + domain),
  title: "バトレコ",
  description: "ポケカプレイヤーのための対戦記録サービス",
  // 開発環境ではタブのfaviconをdev用アイコンに差し替える（本番はicon.png等の静的ファイル規約に任せる）
  icons: isDevEnv()
    ? {
        icon: [
          { url: "/icon_dev-192x192.png", sizes: "192x192", type: "image/png" },
          { url: "/icon_dev-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: "/icon_dev-192x192.png",
      }
    : undefined,
  openGraph: {
    url: "/",
    type: "website",
    title: "バトレコ - ポケカプレイヤーのための対戦記録サービス",
    images: getAppIconUrl(),
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
    <html lang="ja" suppressHydrationWarning data-env={isDevEnv() ? "dev" : "prod"}>
      <body className="overflow-x-hidden bg-white text-foreground dark:bg-neutral-950">
        <GoogleAnalytics gaId={gaId} />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
