import { describe, expect, it } from "vitest";

import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";

import nextConfig from "../../../next.config";

/*
 * 最適化API(/_next/image)の許可先。利用者がアップロードした画像をサーバの sharp に渡さないよう、
 * next.config.ts の images.remotePatterns を Next.js 自身の判定で確かめる。
 */
const CDN = "https://xx8nnpgt.user.webaccel.jp";

function allowed(url: string): boolean {
  return hasRemoteMatch([], nextConfig.images?.remotePatterns ?? [], new URL(url));
}

describe("images.maximumRedirects", () => {
  // Next はリダイレクト先を remotePatterns で検査しないので、追わせない
  it("最適化APIの取得でリダイレクトを追わない", () => {
    expect(nextConfig.images?.maximumRedirects).toBe(0);
  });
});

describe("images.remotePatterns", () => {
  it.each([
    `${CDN}/images/icons/city.png`,
    `${CDN}/images/badges/achievement_1.png?v=1`,
    "https://www.pokemon-card.com/assets/images/card_images/large/SV1/000000_P_A.jpg",
    "https://img.tonamel.com/upload_images/organize_competition/a.png",
  ])("固定素材の %s は通す", (url) => {
    expect(allowed(url)).toBe(true);
  });

  it.each([
    `${CDN}/images/users/user_20261105000000.png`,
    `${CDN}/images/icons/../users/user_20261105000000.png`,
    `${CDN}/images/icons/%2e%2e/users/user_20261105000000.png`,
    "https://s3.isk01.sakurastorage.jp/vsrecorder/images/users/user_20261105000000.png",
    "https://lh3.googleusercontent.com/a/photo",
    "https://pbs.twimg.com/profile_images/1/photo.jpg",
  ])("%s は通さない", (url) => {
    expect(allowed(url)).toBe(false);
  });
});
