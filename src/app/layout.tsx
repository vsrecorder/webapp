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
        {/*
          描画前に iOS の standalone PWA かどうかを判定し、<html> に data-ios-pwa を付与する。
          下部ナビ(MobileNavigation)のレイアウトを CSS 側で切り替えるための目印で、
          クライアント判定を useEffect で行うと初回描画後にガタつくため、ペイント前の
          インラインスクリプトで先に確定させてちらつきを防ぐ。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ua=navigator.userAgent;var isIOS=(/iPad|iPhone|iPod/.test(ua)&&!('MSStream' in window))||(ua.indexOf('Mac')>-1&&navigator.maxTouchPoints>1);var isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(isIOS&&isStandalone){document.documentElement.setAttribute('data-ios-pwa','true');}}catch(e){}})();`,
          }}
        />
        <GoogleAnalytics gaId={gaId} />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
