import type { Metadata } from "next";

import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";

import Layout from "@app/components/templates/Layout";
import { isDevEnv } from "@app/utils/appIcon";
import { OG_SIZE, renderSiteOgImage } from "@app/utils/ogImage";
import { ensureOgImage } from "@app/utils/ogStorage";

const domain = process.env.VSRECORDER_DOMAIN;

const gaId = process.env.FIREBASE_MEASUREMENT_ID
  ? process.env.FIREBASE_MEASUREMENT_ID
  : "";

const title = "バトレコ - ポケカプレイヤーのための対戦記録サービス";
const description = "ポケカプレイヤーのための対戦記録サービス";

export async function generateMetadata(): Promise<Metadata> {
  // 固有のOGP画像を持たないページは、この画像を引き継ぐ。
  const ogImageUrl = await ensureOgImage("site", renderSiteOgImage);

  return {
    metadataBase: new URL(`https://` + domain),
    // 各ページは title に固有部分だけを指定する。サイト名は template が付与する。
    title: {
      default: title,
      template: "%s | バトレコ",
    },
    description,
    alternates: {
      canonical: "/",
    },
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
      title,
      description,
      siteName: "バトレコ",
      locale: "ja_JP",
      images: ogImageUrl ? [{ url: ogImageUrl, ...OG_SIZE, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: "@vsrecorder_mobi",
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

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
