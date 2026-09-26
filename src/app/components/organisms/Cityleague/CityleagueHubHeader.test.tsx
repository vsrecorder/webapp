// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

afterEach(cleanup);

const BASE = {
  backHref: "/cityleague_results/dates",
  backLabel: "開催日から探す",
  eyebrow: "DATE",
  count: 27,
};

describe("CityleagueHubHeader", () => {
  it("titleLines を渡すと見出しを行ごとに分けて出す(つなぐと title と同じ文字列)", () => {
    const lines = ["2026年9月26日(土)の", "シティリーグ入賞デッキ一覧"];
    render(<CityleagueHubHeader {...BASE} title={lines.join("")} titleLines={lines} />);

    const heading = screen.getByRole("heading", { level: 1 });
    // 検索エンジンや読み上げには1続きの見出しとして読める
    expect(heading.textContent).toBe("2026年9月26日(土)のシティリーグ入賞デッキ一覧");
    // 各行はブロックで、「の」の後ろで改行される
    const spans = heading.querySelectorAll(":scope > span.block");
    expect([...spans].map((span) => span.textContent)).toEqual(lines);
  });

  it("titleLines が無ければ title をそのまま出す", () => {
    render(<CityleagueHubHeader {...BASE} title="開催日から探す" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("開催日から探す");
    expect(heading.querySelectorAll(":scope > span")).toHaveLength(0);
  });
});
