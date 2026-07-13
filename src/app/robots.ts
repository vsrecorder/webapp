import { MetadataRoute } from "next";

// robots.ts も sitemap.ts と同様にビルド時に静的生成されるため、実行時にしか渡らない
// VSRECORDER_DOMAIN が undefined のまま焼き込まれる。リクエスト時に評価させる。
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const domain = process.env.VSRECORDER_DOMAIN;

  return {
    rules: [
      {
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
      },
      {
        userAgent: ["Applebot", "bingbot", "Y!J-BRW", "Linespider", "notebot"],
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
