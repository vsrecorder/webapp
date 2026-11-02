import { describe, expect, it } from "vitest";

import { FixedWindowLimiter } from "@app/utils/fixedWindowLimiter";

function clock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("FixedWindowLimiter", () => {
  it("上限までは通し、超えたら残り時間つきで拒否する", () => {
    const c = clock(1_000);
    const limiter = new FixedWindowLimiter(3, 60_000, c.now);

    expect(limiter.consume("u1")).toEqual({ allowed: true });
    expect(limiter.consume("u1")).toEqual({ allowed: true });
    expect(limiter.consume("u1")).toEqual({ allowed: true });

    c.advance(10_000);
    expect(limiter.consume("u1")).toEqual({ allowed: false, retryAfterMs: 50_000 });
  });

  it("鍵ごとに別々に数える", () => {
    const limiter = new FixedWindowLimiter(1, 60_000, clock().now);

    expect(limiter.consume("u1").allowed).toBe(true);
    expect(limiter.consume("u1").allowed).toBe(false);
    expect(limiter.consume("u2").allowed).toBe(true);
  });

  it("窓が過ぎたら数え直す", () => {
    const c = clock();
    const limiter = new FixedWindowLimiter(1, 60_000, c.now);

    expect(limiter.consume("u1").allowed).toBe(true);
    c.advance(59_999);
    expect(limiter.consume("u1").allowed).toBe(false);
    c.advance(1);
    expect(limiter.consume("u1").allowed).toBe(true);
  });

  it("拒否された呼び出しは数えず、窓も延びない", () => {
    const c = clock();
    const limiter = new FixedWindowLimiter(1, 60_000, c.now);

    limiter.consume("u1");
    for (let i = 0; i < 100; i++) {
      c.advance(500);
      limiter.consume("u1");
    }
    // 開始から 50 秒。最初の窓の終わり(60 秒)を過ぎれば通る
    c.advance(10_000);
    expect(limiter.consume("u1").allowed).toBe(true);
  });

  it("窓が過ぎた鍵は捨てる(鍵が増え続けない)", () => {
    const c = clock();
    const limiter = new FixedWindowLimiter(1, 60_000, c.now);

    for (let i = 0; i < 50; i++) {
      limiter.consume(`u${i}`);
    }
    expect(limiter.size).toBe(50);

    c.advance(60_000);
    limiter.consume("other");
    expect(limiter.size).toBe(1);
  });

  it("不正な上限・窓は作れない", () => {
    expect(() => new FixedWindowLimiter(0, 1_000)).toThrow();
    expect(() => new FixedWindowLimiter(1.5, 1_000)).toThrow();
    expect(() => new FixedWindowLimiter(1, 0)).toThrow();
  });
});
