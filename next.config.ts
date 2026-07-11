import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["local.vsrecorder.mobi"],
  images: {
    // 最適化画像のキャッシュ最小保持時間（秒）
    // 画像の更新を早く反映したいので短めに設定。長くすると再最適化の負荷は減る。
    // 注意: 元画像のCache-Controlのmax-ageの方が長い場合はそちらが優先される。
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.pokemon-card.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.isk01.sakurastorage.jp",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "xx8nnpgt.user.webaccel.jp",
        port: "",
        pathname: "/**",
      },
    ],
  },
  reactStrictMode: false,
  output: "standalone",
};

export default nextConfig;
