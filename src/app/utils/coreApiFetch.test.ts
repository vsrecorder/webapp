import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  UpstreamUnavailableError,
  fetchCoreApi,
  resetCoreApiOutageForTest,
} from "@app/utils/coreApiFetch";
import { UPSTREAM_UNAVAILABLE_DIGEST } from "@app/utils/upstreamOutage";

/*
 * core-apiserver の入れ替え中は、nginx 経由なら deploying.html(HTML の 503)、
 * 直接つなぐ構成なら接続拒否になる。どちらも数秒で戻るので、送り直してよいものだけ待って繋ぎ直す。
 */

function response(status: number, contentType: string, body = ""): Response {
  return new Response(body || null, { status, headers: { "content-type": contentType } });
}

const deploying = () => response(503, "text/html", "<html>アップデート中</html>");
const ok = () => response(200, "application/json", "{}");

function connectError(code: string): TypeError {
  return new TypeError("fetch failed", { cause: Object.assign(new Error(code), { code }) });
}

/** 時計を進めるだけの sleep。実際には待たない */
function fakeClock() {
  let t = 1_000_000;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
  };
}

describe("fetchCoreApi", () => {
  beforeEach(() => {
    resetCoreApiOutageForTest();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("GET は nginx の HTML の 503 のあいだ繋ぎ直し、戻ったら応答を返す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchCoreApi("https://example.test/api/v1beta/x", {}, fakeClock());

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("core-apiserver が JSON で返した 503 は送り直さない(上流の判断なので)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(503, "application/json", "{}"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchCoreApi("https://example.test/api", {}, fakeClock());

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // nginx は送れたかどうかを区別して返さないので、書き込みを送り直すと二重に処理されうる
  it("POST は nginx の HTML の 503 でも送り直さず、その応答を返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(deploying());
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchCoreApi(
      "https://example.test/api",
      { method: "POST", body: "{}" },
      fakeClock(),
    );

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("接続拒否は送ってすらいないので、POST でも繋ぎ直す", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(connectError("ECONNREFUSED"))
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchCoreApi(
      "https://example.test/api",
      { method: "POST", body: "{}" },
      fakeClock(),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("送ったあとに切れた POST は送り直さず、digest 付きの UpstreamUnavailableError にする", async () => {
    const fetchMock = vi.fn().mockRejectedValue(connectError("ECONNRESET"));
    vi.stubGlobal("fetch", fetchMock);

    const error = await fetchCoreApi(
      "https://example.test/api",
      { method: "POST", body: "{}" },
      fakeClock(),
    ).catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamUnavailableError);
    expect((error as UpstreamUnavailableError).digest).toBe(UPSTREAM_UNAVAILABLE_DIGEST);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("時間切れなど、止まっている以外の失敗はそのまま投げる", async () => {
    const timeout = new DOMException("timed out", "TimeoutError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));

    await expect(fetchCoreApi("https://example.test/api", {}, fakeClock())).rejects.toBe(timeout);
  });

  it("待つのは届かなくなってから 5 秒まで。過ぎたら最後の応答を返す", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => deploying());
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchCoreApi("https://example.test/api", {}, fakeClock());

    expect(res.status).toBe(503);
    // 0, 0.5, ..., 5.0 秒の 11 回(次の 5.5 秒は枠の外)
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  // 上流を何度も呼ぶページで、1回ごとに 5 秒待つと待ちが積み重なる
  it("枠を使い切ったあとの呼び出しは待たずに返し、一度届けば枠を戻す", async () => {
    const clock = fakeClock();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => deploying()));
    await fetchCoreApi("https://example.test/api/a", {}, clock);

    const second = vi.fn().mockImplementation(async () => deploying());
    vi.stubGlobal("fetch", second);
    await fetchCoreApi("https://example.test/api/b", {}, clock);
    expect(second).toHaveBeenCalledTimes(1);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
    await fetchCoreApi("https://example.test/api/c", {}, clock);

    const fourth = vi
      .fn()
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fourth);
    const res = await fetchCoreApi("https://example.test/api/d", {}, clock);
    expect(res.status).toBe(200);
    expect(fourth).toHaveBeenCalledTimes(2);
  });

  // 止まっている間も Next のデータキャッシュからは 200 が返る。それで「届いた」と数えると、
  // ページを開くたびにまた 5 秒待つ(本番ビルドで実際に起きた)
  it("キャッシュから返り得る取得(force-cache / revalidate)の成功では枠を戻さない", async () => {
    const clock = fakeClock();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => deploying()));
    await fetchCoreApi("https://example.test/api/a", {}, clock);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok()));
    await fetchCoreApi("https://example.test/api/cached", { cache: "force-cache" }, clock);
    await fetchCoreApi(
      "https://example.test/api/cached",
      { next: { revalidate: 300 } } as RequestInit,
      clock,
    );

    const after = vi.fn().mockImplementation(async () => deploying());
    vi.stubGlobal("fetch", after);
    await fetchCoreApi("https://example.test/api/b", {}, clock);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("時間切れなどの例外では枠を戻さない(届いた証拠にならない)", async () => {
    const clock = fakeClock();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => deploying()));
    await fetchCoreApi("https://example.test/api/a", {}, clock);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    );
    await fetchCoreApi("https://example.test/api/t", {}, clock).catch(() => {});

    const after = vi.fn().mockImplementation(async () => deploying());
    vi.stubGlobal("fetch", after);
    await fetchCoreApi("https://example.test/api/b", {}, clock);
    expect(after).toHaveBeenCalledTimes(1);
  });

  // キャッシュから返る取得しか来ないと枠は戻らない。それでも後日の別の停止では繋ぎ直す
  it("最後に届かなかったときから 10 秒過ぎたら、新しい停止として繋ぎ直す", async () => {
    const clock = fakeClock();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => deploying()));
    await fetchCoreApi("https://example.test/api/a", {}, clock);

    await clock.sleep(10_001);

    const later = vi
      .fn()
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", later);
    const res = await fetchCoreApi("https://example.test/api/b", {}, clock);
    expect(res.status).toBe(200);
    expect(later).toHaveBeenCalledTimes(2);
  });

  // サーバコンポーネントの中では、Next が同じ GET をまとめていて、signal が無いと
  // 送り直しても最初の失敗の複製が返るだけになる(next/dist/server/lib/dedupe-fetch.js)
  it("2回目以降の試行にだけ新しい signal を付ける(1回目はまとめを残す)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);

    await fetchCoreApi("https://example.test/api", { cache: "no-store" }, fakeClock());

    const inits = fetchMock.mock.calls.map((c) => c[1] as RequestInit);
    expect(inits[0].signal).toBeUndefined();
    expect(inits[1].signal).toBeInstanceOf(AbortSignal);
    expect(inits[2].signal).toBeInstanceOf(AbortSignal);
    expect(inits[1].cache).toBe("no-store");
  });

  it("呼び出し側が signal を渡していれば、それをそのまま使う", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(deploying())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    await fetchCoreApi("https://example.test/api", { signal }, fakeClock());

    expect((fetchMock.mock.calls[1][1] as RequestInit).signal).toBe(signal);
  });
});
