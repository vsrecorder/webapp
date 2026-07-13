import type { MetadataRoute } from "next";

// manifest.ts もビルド時に静的生成されるため、実行時にしか渡らない ENV が undefined のまま
// 焼き込まれ、dev環境でも本番の名前・アイコンが配信されてしまう。リクエスト時に評価させる。
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const env = process.env.ENV;

  return {
    name:
      env == "dev"
        ? "開発版バトレコ - ポケカプレイヤーのための対戦記録サービス"
        : "バトレコ - ポケカプレイヤーのための対戦記録サービス",
    short_name: env == "dev" ? "開発版バトレコ" : "バトレコ",
    description: "ポケカプレイヤーのための対戦記録サービス",
    start_url: "/",
    display: "standalone",
    // 本番はヒーローセクションの blue-600 に合わせる。dev環境は一目で区別できるようオレンジにする
    background_color: env == "dev" ? "#EA580C" : "#2563EB",
    theme_color: env == "dev" ? "#EA580C" : "#2563EB",
    icons:
      env == "dev"
        ? [
            {
              src: "/icon_dev-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icon_dev-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/maskable_icon_dev_x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/maskable_icon_dev_x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ]
        : [
            {
              src: "/icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/maskable_icon_x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/maskable_icon_x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
  };
}
