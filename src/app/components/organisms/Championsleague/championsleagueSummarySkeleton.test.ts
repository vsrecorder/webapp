import { describe, expect, it } from "vitest";

import { championsleagueSummarySkeletonLines } from "@app/components/organisms/Championsleague/championsleagueSummarySkeleton";

describe("championsleagueSummarySkeletonLines", () => {
  // 本番の要約文が 390px 幅で6行になる大会(2026-11-25 の実測)
  it.each([
    "cl2025_tokyo",
    "cl2025_osaka",
    "cl2026_yokohama",
    "cl2026_aichi_dec",
    "cl2026_osaka",
    "cl2026_aichi_may",
    "cl2027_chiba",
  ])("%s のシニア・ジュニアは6行、マスターは5行", (id) => {
    expect(championsleagueSummarySkeletonLines(id, "senior")).toBe(6);
    expect(championsleagueSummarySkeletonLines(id, "junior")).toBe(6);
    expect(championsleagueSummarySkeletonLines(id, "master")).toBe(5);
    expect(championsleagueSummarySkeletonLines(id, "open")).toBe(5);
  });

  it("これから開かれるチャンピオンズリーグも、シニア・ジュニアは6行とみなす", () => {
    expect(championsleagueSummarySkeletonLines("cl2027_osaka", "senior")).toBe(6);
    expect(championsleagueSummarySkeletonLines("cl2028_aichi", "junior")).toBe(6);
  });

  it.each([
    "cl2024_aichi",
    "cl2025_aichi",
    "cl2025_fukuoka",
    "cl2025_miyagi",
    "cl2026_fukuoka",
    "cl2027_yokohama",
    "pjcs2026",
  ])("%s は5行", (id) => {
    expect(championsleagueSummarySkeletonLines(id, "senior")).toBe(5);
    expect(championsleagueSummarySkeletonLines(id, "junior")).toBe(5);
  });

  it("ID や区分が読めなければ5行", () => {
    expect(championsleagueSummarySkeletonLines(undefined, "senior")).toBe(5);
    expect(championsleagueSummarySkeletonLines("", "senior")).toBe(5);
    expect(championsleagueSummarySkeletonLines("cl2027_chiba", undefined)).toBe(5);
  });
});
