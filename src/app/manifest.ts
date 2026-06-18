import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "バトレコ - ポケカプレイヤーのための対戦記録サービス",
    short_name: "バトレコ",
    description: "ポケカプレイヤーのための対戦記録サービス",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    // ヒーローセクションの blue-600 に合わせる
    theme_color: "#2563EB",
    icons: [
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
      /*
      {
        src: "/icon-192x192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      */
      {
        src: "/maskable_icon_x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      /*
      {
        src: "/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      */
    ],
  };
}
