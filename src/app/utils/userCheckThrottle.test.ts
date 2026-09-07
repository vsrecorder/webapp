import { describe, expect, it, vi } from "vitest";

import { createUserCheckThrottle } from "@app/utils/userCheckThrottle";

const TTL = 1000;

function setup(startAt = 10_000) {
  let current = startAt;
  const throttle = createUserCheckThrottle({ ttlMs: TTL, now: () => current });

  return { throttle, advance: (ms: number) => (current += ms) };
}

describe("createUserCheckThrottle", () => {
  it("直近に確認済みなら問い合わせない", async () => {
    const { throttle, advance } = setup();
    const run = vi.fn().mockResolvedValue(false);

    // セッションが持つ確認時刻が新しいうちは問い合わせない
    await expect(throttle.check("u1", 10_000, run)).resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();

    // 期限を過ぎたら1回だけ問い合わせ、その後は再び間引く
    advance(TTL + 1);
    await throttle.check("u1", 10_000, run);
    await throttle.check("u1", 10_000, run);
    expect(run).toHaveBeenCalledTimes(1);

    // プロセス内の記録も期限切れになれば、また問い合わせる
    advance(TTL + 1);
    await throttle.check("u1", 10_000, run);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("並行する確認は1回にまとめ、結果を共有する", async () => {
    const { throttle } = setup();
    let resolve: (deleted: boolean) => void = () => {};
    const run = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));

    const calls = [
      throttle.check("u1", undefined, run),
      throttle.check("u1", undefined, run),
      throttle.check("u1", undefined, run),
    ];
    expect(run).toHaveBeenCalledTimes(1);

    resolve(true);
    expect(await Promise.all(calls)).toEqual([true, true, true]);
  });

  it("ユーザごとに独立して間引く", async () => {
    const { throttle } = setup();
    const run = vi.fn().mockResolvedValue(false);

    await throttle.check("u1", undefined, run);
    await throttle.check("u2", undefined, run);
    await throttle.check("u1", undefined, run);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("失敗しても時刻を進め、次の期限まで問い合わせを繰り返さない", async () => {
    const { throttle } = setup();
    const run = vi.fn().mockRejectedValue(new Error("upstream down"));

    await expect(throttle.check("u1", undefined, run)).rejects.toThrow("upstream down");
    await expect(throttle.check("u1", undefined, run)).resolves.toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("覚えるユーザ数に上限があり、超えたら古いものから落とす", async () => {
    let current = 10_000;
    const throttle = createUserCheckThrottle({ ttlMs: TTL, maxEntries: 2, now: () => current });
    const run = vi.fn().mockResolvedValue(false);

    await throttle.check("u1", undefined, run);
    current += 1;
    await throttle.check("u2", undefined, run);
    current += 1;
    await throttle.check("u3", undefined, run);
    expect(run).toHaveBeenCalledTimes(3);

    // u1 は落ちているので再び問い合わせ、u3 は覚えているので間引く
    await throttle.check("u1", undefined, run);
    expect(run).toHaveBeenCalledTimes(4);
    await throttle.check("u3", undefined, run);
    expect(run).toHaveBeenCalledTimes(4);
  });
});
