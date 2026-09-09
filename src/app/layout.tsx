import type { Metadata } from "next";
import { preconnect } from "react-dom";

import "./globals.css";

import LazyGoogleAnalytics from "@app/components/atoms/LazyGoogleAnalytics";

import Layout from "@app/components/templates/Layout";
import { isDevEnv } from "@app/utils/appIcon";
import { platformDetectScript } from "@app/utils/platformDetectScript";
import { getStatusBarColor } from "@app/utils/pwaColors";
import { OG_SIZE, renderSiteOgImage } from "@app/utils/ogImage";
import { ensureOgImage } from "@app/utils/ogStorage";
import { CDN_ORIGIN } from "@app/utils/cdn";
import { SITE_DESCRIPTION, SITE_TITLE } from "@app/utils/siteMeta";

const domain = process.env.VSRECORDER_DOMAIN;

// GA4の測定ID。Firebaseコンソールが払い出す measurementId をそのまま使っている
// (dev/prodで別プロパティを指す)。未設定の環境では計測タグごと出さない。
// 空文字のまま <GoogleAnalytics> を描画すると、id 無しの gtag/js を取りに行ったうえで
// gtag('config','') まで実行してしまい、無駄なリクエストとコンソールエラーになる。
const gaId = process.env.FIREBASE_MEASUREMENT_ID ?? "";

const title = SITE_TITLE;
const description = SITE_DESCRIPTION;

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
  // 画像 CDN へ先に接続しておく(<head> に <link rel="preconnect"> が入る)。
  // ほぼ全ページがスプライトかデッキ画像をこの CDN から読み、最初の1枚で DNS と TLS の確立を
  // 待っていた(モバイル回線で 100〜300ms)。画像は CORS 無しの <img> なので crossOrigin は付けない。
  preconnect(CDN_ORIGIN);

  return (
    <html lang="ja" suppressHydrationWarning data-env={isDevEnv() ? "dev" : "prod"}>
      <body className="overflow-x-hidden bg-white text-foreground dark:bg-neutral-950">
        {/*
          描画前に iOS の standalone PWA かどうか / Android かどうかを判定して <html> に目印を付け、
          Android の standalone PWA ではステータスバー色の <meta name="theme-color"> も足す。
          内容と理由は platformDetectScript.ts を参照。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: platformDetectScript(getStatusBarColor()),
          }}
        />
        {/*
          dev環境では debugMode を有効にし、GA4のDebugViewでイベントを即時検証できるようにする。
          (gtag('config') に debug_mode を渡すだけで、本番の計測には影響しない)
        */}
        {gaId ? <LazyGoogleAnalytics gaId={gaId} debugMode={isDevEnv()} /> : null}
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
