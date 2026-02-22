import { MetadataRoute } from "next";

const domain = process.env.VSRECORDER_DOMAIN;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Twitterbot",
        allow: ["/decks", "/records"],
        disallow: "/",
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
