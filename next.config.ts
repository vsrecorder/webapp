import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["local.vsrecorder.mobi"],
  images: {
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
