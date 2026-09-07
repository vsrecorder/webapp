import { describe, expect, it } from "vitest";

import { createRenderIdTracker } from "@app/utils/serverRenderFreshness";

describe("createRenderIdTracker", () => {
  it("初めて見る id は新しい、二度目は使い回しとみなす", () => {
    const tracker = createRenderIdTracker();

    expect(tracker.consume("r1")).toBe(true);
    expect(tracker.consume("r1")).toBe(false);
    expect(tracker.consume("r1")).toBe(false);
  });

  it("id ごとに独立して判定する", () => {
    const tracker = createRenderIdTracker();

    expect(tracker.consume("r1")).toBe(true);
    expect(tracker.consume("r2")).toBe(true);
    expect(tracker.consume("r1")).toBe(false);
    expect(tracker.consume("r2")).toBe(false);
  });

  it("id が無いときは新しいと言い切らない(取り直す側へ倒す)", () => {
    const tracker = createRenderIdTracker();

    expect(tracker.consume(undefined)).toBe(false);
    expect(tracker.consume("")).toBe(false);
  });

  it("覚える数に上限があり、超えたら古いものから落とす", () => {
    const tracker = createRenderIdTracker(2);

    expect(tracker.consume("r1")).toBe(true);
    expect(tracker.consume("r2")).toBe(true);
    expect(tracker.consume("r3")).toBe(true);

    // r1 は落ちているので「初めて」に戻る。直近の r2・r3 は覚えている
    expect(tracker.consume("r2")).toBe(false);
    expect(tracker.consume("r3")).toBe(false);
  });
});
