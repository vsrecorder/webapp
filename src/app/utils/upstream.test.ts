import { afterEach, describe, expect, it, vi } from "vitest";

import { UpstreamError, fetchUpstream } from "@app/utils/upstream";

/*
 * 上流の失敗がJSONで返るとは限らない。
 *
 * nginx はデプロイ中の 502/504 を deploying.html の 503 に、手動メンテナンスを
 * maintenance.html の 503 に差し替えるため、上流の応答がHTMLになることがある。
 * これを res.json() で読もうとして例外にすると、ルートハンドラは上流のステータスを
 * 返せず 500 になる(本番 2026-09-14 12:39 のデプロイ中、/api/users/{id}/deck-usage で
 * 実際に起きた。同じ瞬間、fetchUpstream を使っていたルートは 503 を返せていた)。
 */
const DEPLOYING_HTML = "<!doctype html><html><body>アップデート中です</body></html>";

function stubFetch(status: number, body: string) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response);

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("fetchUpstream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("成功した応答のJSONを返す", async () => {
    stubFetch(200, JSON.stringify({ id: "x", name: "テスト" }));

    await expect(fetchUpstream("https://example.test/api")).resolves.toEqual({
      id: "x",
      name: "テスト",
    });
  });

  it("204など空ボディのときは null を返す", async () => {
    stubFetch(204, "");

    await expect(fetchUpstream("https://example.test/api")).resolves.toBeNull();
  });

  it("デプロイ中のHTML応答でも、解析で落ちずに上流のステータスを保つ", async () => {
    stubFetch(503, DEPLOYING_HTML);

    const error = await fetchUpstream("https://example.test/api").catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(503);
    expect((error as UpstreamError).bodyIsJson).toBe(false);
  });

  it("上流がJSONで返した失敗は、そのボディとステータスを持つ", async () => {
    stubFetch(404, JSON.stringify({ error: "not found" }));

    const error = await fetchUpstream("https://example.test/api").catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(404);
    expect((error as UpstreamError).body).toEqual({ error: "not found" });
    expect((error as UpstreamError).bodyIsJson).toBe(true);
  });

  // 404 がバックエンドの答えか、手前のプロキシが返したHTMLかは bodyIsJson で見分ける。
  // /api/users/{id} はこれを使い、後者を 502 にして「ユーザ不在」と区別している。
  it("HTMLで返された404は bodyIsJson が false になる", async () => {
    stubFetch(404, DEPLOYING_HTML);

    const error = await fetchUpstream("https://example.test/api").catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(404);
    expect((error as UpstreamError).bodyIsJson).toBe(false);
  });

  it("200でもJSONとして読めない応答は502にする", async () => {
    stubFetch(200, DEPLOYING_HTML);

    const error = await fetchUpstream("https://example.test/api").catch((e) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).status).toBe(502);
  });

  it("既定は no-store だが、呼び出し側の cache 指定で上書きできる", async () => {
    const fetchMock = stubFetch(200, JSON.stringify([]));

    await fetchUpstream("https://example.test/api", {
      cache: "force-cache",
      next: { revalidate: 3600 },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api",
      expect.objectContaining({ cache: "force-cache", next: { revalidate: 3600 } }),
    );
  });
});
