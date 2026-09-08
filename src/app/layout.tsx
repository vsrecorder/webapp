import type { Metadata, Viewport } from "next";
import { preconnect } from "react-dom";

import "./globals.css";

import LazyGoogleAnalytics from "@app/components/atoms/LazyGoogleAnalytics";

import Layout from "@app/components/templates/Layout";
import { isDevEnv } from "@app/utils/appIcon";
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

/*
 * ステータスバー / システムバーまわりの指定。ENV で色が変わるので generateViewport で
 * リクエスト時に評価する(静的な viewport にすると manifest.ts と同じくビルド時に
 * 焼き込まれ、dev 環境でも本番の色が出る)。
 */
export function generateViewport(): Viewport {
  return {
    /*
     * viewport-fit=cover。ページの描画領域を画面いっぱいまで広げ、env(safe-area-inset-*) に
     * 実際の値を返させるための指定。
     *
     * ただし**現状どちらの OS でも実効していない**(2026-09-09 実機実測):
     *   - Android の PWA は Chrome の WebAPK がウィンドウをシステムバーの内側に収めており、
     *     cover を付けても広げる先が無い(inset は上下左右とも 0px)
     *   - iOS は apple-mobile-web-app-status-bar-style: black-translucent が要るが、
     *     そちらは下記の理由で使わない
     * 害は無く、ブラウザ側が対応すれば env を使っている箇所(下部ナビ・シート・
     * フローティング・--header-height)がそのまま効くようになるので残してある。
     */
    viewportFit: "cover",
    /*
     * ライト / ダークの両対応であることをサーバ描画の時点で宣言する。
     * 実際のテーマは next-themes がクライアントで `<html>` に付けるが、それはハイドレーション後。
     * それまでブラウザは「ライトのページ」とみなし、自分が描くもの(スクロールバー、
     * フォームコントロール)を明るい色で塗る。
     */
    colorScheme: "light dark",
    /*
     * ステータスバーの色。iOS のホーム画面に追加した PWA では、これがそのまま
     * ステータスバーの地色になる(指定が無いと白のままで、青やオレンジのヘッダーの上に
     * 白い帯が乗って見える)。値はヘッダーのグラデーション始点 = manifest の theme_color と
     * 同じものを使う。片方だけ変えると PWA の起動直後と表示中で色が食い違う。
     *
     * 文字色は指定できず、iOS がこの地色の明暗から自動で決める。
     *
     * apple-mobile-web-app-status-bar-style: black-translucent は使わない。
     * ステータスバーを透明にしてヘッダーの色を上まで届かせられる反面、文字色が
     * 端末のライト / ダーク設定に従うため、ライト設定の端末では**濃い色のヘッダーに
     * 黒文字**が乗って読めなくなる。描画領域が上へ広がるぶん起動直後にレイアウトが
     * 動く(下部ナビが少し上がって見える)副作用もあった。
     */
    themeColor: isDevEnv() ? "#EA580C" : "#2563EB",
  };
}

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
          描画前に iOS の standalone PWA かどうか / Android かどうかを判定し、
          <html> に data-ios-pwa / data-android を付与する。下部ナビやシートの下端を
          CSS 側で詰めるための目印(globals.css 参照)。

          どちらの PWA も env(safe-area-inset-*) が 0 のままで、画面下端の帯
          (Android のジェスチャーバー / iOS のホームインジケータ)はビューポートの外にある。
          そこへ背景を敷けない代わりに、帯のぶんを見越して中身の位置を実寸で詰めている。
          クライアント判定を useEffect で行うと初回描画後にガタつくため、ペイント前の
          インラインスクリプトで先に確定させる。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ua=navigator.userAgent;var isIOS=(/iPad|iPhone|iPod/.test(ua)&&!('MSStream' in window))||(ua.indexOf('Mac')>-1&&navigator.maxTouchPoints>1);var isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(isIOS&&isStandalone){document.documentElement.setAttribute('data-ios-pwa','true');}if(!isIOS&&/Android/i.test(ua)){document.documentElement.setAttribute('data-android','true');}}catch(e){}})();`,
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
