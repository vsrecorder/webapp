import { MetadataRoute } from "next";

// robots.ts も sitemap.ts と同様にビルド時に静的生成されるため、実行時にしか渡らない
// VSRECORDER_DOMAIN が undefined のまま焼き込まれる。リクエスト時に評価させる。
export const dynamic = "force-dynamic";

// 検索エンジンにクロールさせないパス。
//
// Google のクロール割当はこのサイトに対して1日15件程度しか無く(2026-08 の GSC 実測)、
// 索引に載せる価値の無い URL に使わせると、その分だけシティリーグ結果ページの消化が遅れる。
// 実際に GSC の「クロール済み - インデックス未登録」に上がっていたのは全て以下の URL だった。
//
//   /__/       Firebase Authentication の補助ページ。authDomain をこのドメインにしているため
//              200 で返り、クエリ違いで何度も拾われていた
//   /api/      BFF(ルートハンドラ)。HTML ではない
//   /decks /records /users /calendar
//              ログイン必須ページ。未認証は proxy.ts が 307 で返すが、クロール自体を止める
//   /auth/     サインインエラー画面
//   /health    死活監視
//
// 前方一致なので /decks は /decks/xxx も含む。/deck_meta は "/decks" に一致しない。
const DISALLOW_PATHS = [
  "/__/",
  "/api/",
  "/decks",
  "/records",
  "/users",
  "/calendar",
  "/auth/",
  "/health",
];

export default function robots(): MetadataRoute.Robots {
  const domain = process.env.VSRECORDER_DOMAIN;

  return {
    rules: [
      {
        // OGP の取得用。従来どおり全体を許可する。
        userAgent: "Twitterbot",
        allow: "/",
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "AdsBot-Google-Mobile",
          "AdsBot-Google",
          "Mediapartners-Google",
          "Google-Safety",
        ],
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      {
        userAgent: ["Applebot", "bingbot", "Y!J-BRW", "Linespider", "notebot"],
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
