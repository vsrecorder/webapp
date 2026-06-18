import { MetadataRoute } from "next";

const domain = process.env.VSRECORDER_DOMAIN;
const url = "https://" + domain;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: url,
      changeFrequency: "always",
    },
    {
      url: url + "/terms",
      changeFrequency: "monthly",
    },
    {
      url: url + "/privacy",
      changeFrequency: "monthly",
    },
    {
      url: url + "/policy",
      changeFrequency: "monthly",
    },
  ];
}
