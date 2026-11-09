import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkUpstream,
  enterUpstreamOutage,
  getUpstreamOutageSnapshot,
  leaveUpstreamOutage,
  onUpstreamRecovered,
  setUpstreamOutageChecking,
  upstreamOutageSignal,
} from "@app/utils/upstreamOutageClient";
import { UPSTREAM_UNAVAILABLE_HEADER } from "@app/utils/upstreamOutage";

const ORIGIN = "https://vsrecorder.mobi";

function res(status: number, headers: Record<string, string> = {}) {
  return { status, headers: new Headers(headers) };
}

describe("upstreamOutageSignal", () => {
  it("BFF がアップデート中のヘッダを付けた応答は core-apiserver の停止", () => {
    expect(
      upstreamOutageSignal(
        new URL(`${ORIGIN}/api/records`),
        res(503, { [UPSTREAM_UNAVAILABLE_HEADER]: "1", "content-type": "application/json" }),
        ORIGIN,
      ),
    ).toBe("core");
  });

  it("nginx の HTML の 503 は webapp の停止(BFF に届いていない)", () => {
    expect(
      upstreamOutageSignal(
        new URL(`${ORIGIN}/api/notifications`),
        res(503, { "content-type": "text/html" }),
        ORIGIN,
      ),
    ).toBe("webapp");
  });

  it("BFF が JSON で返したふつうの失敗では出さない", () => {
    expect(
      upstreamOutageSignal(
        new URL(`${ORIGIN}/api/records`),
        res(500, { "content-type": "application/json" }),
        ORIGIN,
      ),
    ).toBeNull();
    expect(
      upstreamOutageSignal(
        new URL(`${ORIGIN}/api/records`),
        res(503, { "content-type": "application/json" }),
        ORIGIN,
      ),
    ).toBeNull();
  });

  it("/api/ 以外・別オリジン・確認の口そのものでは出さない", () => {
    const html503 = res(503, { "content-type": "text/html" });
    expect(upstreamOutageSignal(new URL(`${ORIGIN}/records`), html503, ORIGIN)).toBeNull();
    expect(
      upstreamOutageSignal(new URL("https://lab.vsrecorder.mobi/api/x"), html503, ORIGIN),
    ).toBeNull();
    expect(
      upstreamOutageSignal(new URL(`${ORIGIN}/api/upstream_status`), html503, ORIGIN),
    ).toBeNull();
  });
});

describe("覆いの状態", () => {
  it("立てて、確認中を切り替え、下ろすと復旧の購読者に知らせる", () => {
    const recovered = vi.fn();
    const unsubscribe = onUpstreamRecovered(recovered);

    enterUpstreamOutage("core");
    expect(getUpstreamOutageSnapshot()).toEqual({ checking: false, webappRestarted: false });

    // 同じ中身なら参照を変えない(useSyncExternalStore の無駄な再描画を避ける)
    const before = getUpstreamOutageSnapshot();
    enterUpstreamOutage("core");
    setUpstreamOutageChecking(false);
    expect(getUpstreamOutageSnapshot()).toBe(before);

    setUpstreamOutageChecking(true);
    expect(getUpstreamOutageSnapshot()).toEqual({ checking: true, webappRestarted: false });

    leaveUpstreamOutage();
    expect(getUpstreamOutageSnapshot()).toBeNull();
    expect(recovered).toHaveBeenCalledWith(false);

    // 立っていないときに下ろしても知らせない
    leaveUpstreamOutage();
    expect(recovered).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  // webapp が入れ替わったあとに router.refresh すると、Next がページ全体を読み込み直して入力が消える。
  // 覆いはこの印を見て refresh を控える
  it("一度でも webapp の停止を受けたら、core の信号が続いても webappRestarted のまま", () => {
    const recovered = vi.fn();
    const unsubscribe = onUpstreamRecovered(recovered);

    enterUpstreamOutage("core");
    enterUpstreamOutage("webapp");
    enterUpstreamOutage("core");
    expect(getUpstreamOutageSnapshot()?.webappRestarted).toBe(true);

    leaveUpstreamOutage();
    expect(recovered).toHaveBeenCalledWith(true);

    // 次の停止は新しく数える
    enterUpstreamOutage("core");
    expect(getUpstreamOutageSnapshot()?.webappRestarted).toBe(false);
    leaveUpstreamOutage();

    unsubscribe();
  });
});

describe("checkUpstream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubWindowFetch(impl: () => Promise<Response>) {
    vi.stubGlobal("window", { fetch: vi.fn().mockImplementation(impl) });
  }

  it("200 なら ok、BFF の 503 なら unavailable", async () => {
    stubWindowFetch(async () => new Response("{}", { status: 200 }));
    await expect(checkUpstream()).resolves.toBe("ok");

    stubWindowFetch(
      async () =>
        new Response("{}", { status: 503, headers: { "content-type": "application/json" } }),
    );
    await expect(checkUpstream()).resolves.toBe("unavailable");
  });

  it("webapp の入れ替え中の deploying.html は unavailable、maintenance.html は maintenance", async () => {
    stubWindowFetch(
      async () =>
        new Response('<div class="deploying-container"></div>', {
          status: 503,
          headers: { "content-type": "text/html" },
        }),
    );
    await expect(checkUpstream()).resolves.toBe("unavailable");

    stubWindowFetch(
      async () =>
        new Response('<div class="maintenance-container"></div>', {
          status: 503,
          headers: { "content-type": "text/html" },
        }),
    );
    await expect(checkUpstream()).resolves.toBe("maintenance");
  });

  // 回線が悪いだけで「止まっている」と判定すると、error.tsx が覆いを出して外れなくなる
  it("応答が返らない(回線の問題・時間切れ)ときは unreachable", async () => {
    stubWindowFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(checkUpstream()).resolves.toBe("unreachable");
  });
});
