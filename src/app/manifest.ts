import type { MetadataRoute } from "next";

const env = process.env.ENV;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:
      env == "dev"
        ? "開発版バトレコ - ポケカプレイヤーのための対戦記録サービス"
        : "バトレコ - ポケカプレイヤーのための対戦記録サービス",
    short_name: env == "dev" ? "開発版バトレコ" : "バトレコ",
    description: "ポケカプレイヤーのための対戦記録サービス",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    // ヒーローセクションの blue-600 に合わせる
    theme_color: "#2563EB",
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
