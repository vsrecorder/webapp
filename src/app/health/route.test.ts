import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, HEAD } from "./route";

/*
 * 外形監視の口(/health)が、上流の状態を状態コードと本文で正しく言い分けることを確かめる。
 * 監視は状態コードで判定するので、200 と 503 を取り違えると障害を見落とすか、正常なのに鳴り続ける。
 * 本文はどこが駄目なのかを人が見るためのもの。
 */

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function upstreamResponse(status: number, body: string): Promise<Response> {
  return Promise.resolve(new Response(body, { status }));
}

describe("/health", () => {
  beforeEach(() => {
    vi.stubEnv("VSRECORDER_UPSTREAM_ORIGIN", "http://upstream.test");
    // 失敗時の console.error でテストの出力を汚さない
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("core-apiserver が DB まで届けば 200 と ok を返す", async () => {
    const fetchMock = stubFetch(() => upstreamResponse(200, "ok"));

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok\n");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://upstream.test/api/v1beta/health/db",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("どこにもキャッシュさせず、検索結果にも出さない", async () => {
    stubFetch(() => upstreamResponse(200, "ok"));

    const res = await GET();

    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("core-apiserver が DB に届かなければ 503 と db unreachable を返す", async () => {
    stubFetch(() => upstreamResponse(503, "db unreachable"));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("db unreachable\n");
  });

  // nginx の計画メンテナンス・デプロイ中の画面も 503 で返る。DB のせいにしない
  it("本文が違う 503 は api unreachable として返す", async () => {
    stubFetch(() => upstreamResponse(503, "<!doctype html><html>メンテナンス中</html>"));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("api unreachable\n");
  });

  // 経路が無い(core-apiserver が古いまま)・5xx などは API 側の問題として扱う
  it.each([404, 500, 502])("core-apiserver が %i を返せば 503 と api unreachable を返す", async (status) => {
    stubFetch(() => upstreamResponse(status, "error"));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("api unreachable\n");
  });

  it("core-apiserver に繋がらなければ 503 と api unreachable を返す", async () => {
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("api unreachable\n");
  });

  it("時間切れも 503 と api unreachable を返す", async () => {
    stubFetch(() => Promise.reject(new DOMException("The operation was aborted due to timeout", "TimeoutError")));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.text()).toBe("api unreachable\n");
  });

  it("HEAD も GET と同じ確認をする", async () => {
    const fetchMock = stubFetch(() => upstreamResponse(503, "db unreachable"));

    const res = await HEAD();

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
