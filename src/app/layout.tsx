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
 * viewport-fit=cover。ページの描画領域を画面いっぱい(ステータスバー / Android の
 * ジェスチャーバー / iOS のホームインジケータの下)まで広げる。
 *
 * 既定の auto ではビューポートがそれらの内側に収まる代わりに、**env(safe-area-inset-*) が
 * すべて 0 になる**。0 のままだと、ホーム画面に追加した PWA の下端がページの色ではなく
 * システムの色で塗られ、ダークテーマで使っていても画面下端に白い帯が残る
 * (2026-09-09 に Android で実測。最下部 65px = 約22dp が #FFF7EC だった)。
 *
 * cover にすると代わりに「ヘッダーがステータスバーに潜り込む」「シートの下端が
 * ジェスチャーバーに被る」ので、そのぶんは以下で戻している:
 *   - globals.css の --header-height が env(safe-area-inset-top) を含む
 *   - 下部ナビ / バナー / シートのフッターが env(safe-area-inset-bottom) を足す
 * どちらも刻みの無い端末では 0 になり、元の寸法に戻る。
 *
 * width / initialScale は既定(device-width / 1)のまま。ここで指定しなくても Next.js が出す。
 */
export const viewport: Viewport = {
  viewportFit: "cover",
  /*
   * ライト / ダークの両対応であることをサーバ描画の時点で宣言する。
   *
   * 実際のテーマは next-themes がクライアントで `<html>` に付けるが、それはハイドレーション後。
   * それまでブラウザは「ライトのページ」とみなし、自分が描くもの——スクロールバー、フォーム
   * コントロール、そして **Android の PWA ではシステムのナビゲーションバー**——を明るい色で
   * 塗る。ダークテーマで使っていても画面下端に白い帯が残る症状の原因がこれと見ている
   * (Chrome の PWA には「ダークで白、ライトで黒」と逆転する既知の報告がある)。
   *
   * light dark と両方書くのは、どちらかに寄せるのではなく「システムの設定に従える」と
   * 伝えるため。手動で切り替えたときは next-themes が上書きする。
   */
  colorScheme: "light dark",
};

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
    /*
     * iOS のホーム画面に追加した PWA でのステータスバー。
     *
     * 既定(default)は「白地に黒文字の帯」で、Web の描画領域はその下から始まる。
     * viewport-fit=cover を入れてもここは変わらず、青いヘッダーの上に白い帯が残ってしまう。
     * black-translucent にするとステータスバーが透明になり、描画領域が画面の一番上まで
     * 広がる = ヘッダーの色がそのまま上端まで伸びる。文字は白抜きになるので、
     * 青系のヘッダーとも噛み合う。
     *
     * 描画領域が上に広がるぶん中身がステータスバーに潜り込むが、そのぶんは
     * globals.css の --header-height(env(safe-area-inset-top) を含む)が押し下げる。
     * iOS でこの env が実際の値を返すのは black-translucent のときだけなので、
     * cover とこの指定はセットで意味を持つ。
     */
    appleWebApp: {
      statusBarStyle: "black-translucent",
    },
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
          dev環境では debugMode を有効にし、GA4のDebugViewでイベントを即時検証できるようにする。
          (gtag('config') に debug_mode を渡すだけで、本番の計測には影響しない)
        */}
        {gaId ? <LazyGoogleAnalytics gaId={gaId} debugMode={isDevEnv()} /> : null}
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
