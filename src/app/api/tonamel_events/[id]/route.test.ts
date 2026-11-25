import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UpstreamError } from "@app/utils/upstream";

/*
 * Tonamel のイベント情報の中継。入力欄はここのステータスで表示を出し分ける。
 *   200 … 実在する / 404・400 … 無効なイベントID / それ以外 … 確認できなかった
 */
const fetchUpstream = vi.fn();
vi.mock("@app/utils/upstream", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@app/utils/upstream")>()),
  fetchUpstream: (...args: unknown[]) => fetchUpstream(...args),
}));

const { GET } = await import("@app/api/tonamel_events/[id]/route");

const call = (id: string) =>
  GET(new NextRequest(`https://vsrecorder.test/api/tonamel_events/${encodeURIComponent(id)}`), {
    params: Promise.resolve({ id }),
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/tonamel_events/[id]", () => {
  it("実在するイベントはそのまま返す", async () => {
    fetchUpstream.mockResolvedValue({ id: "YFUVY", title: "テスト大会", image: "" });

    const res = await call("YFUVY");

    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe("テスト大会");
    expect(String(fetchUpstream.mock.calls[0][0])).toContain("/api/v1beta/tonamel_events/YFUVY");
  });

  it("見つからないイベントは 404", async () => {
    fetchUpstream.mockRejectedValue(new UpstreamError(404, { message: "not found" }));

    expect((await call("zzzzz")).status).toBe(404);
  });

  // 以前は上流の 400 を 502 にしていて、変換前の1文字を打っただけで上流の失敗として記録されていた
  it.each([
    ["日本語入力の変換前の文字", "と"],
    ["貼り間違えたデッキコード", "ggNnLL-EBMEEz-Hn969Q"],
    ["スラッシュなどを含む入力", "a/b?c"],
  ])("IDの形が違う(%s)ものは上流へ送らず 400", async (_label, id) => {
    const res = await call(id);

    expect(res.status).toBe(400);
    expect(fetchUpstream).not.toHaveBeenCalled();
  });

  it("形式の確認を通ったIDを上流が 400 で断った場合も 400(502 にしない)", async () => {
    fetchUpstream.mockRejectedValue(new UpstreamError(400, { message: "bad request" }));

    expect((await call("YFUVY")).status).toBe(400);
  });

  it("上流の失敗は 502(見つからないのと区別する)", async () => {
    fetchUpstream.mockRejectedValue(new UpstreamError(500, { message: "internal server error" }));

    expect((await call("YFUVY")).status).toBe(502);
  });

  it("上流に届かなかった場合も 502", async () => {
    fetchUpstream.mockRejectedValue(new TypeError("fetch failed"));

    expect((await call("YFUVY")).status).toBe(502);
  });
});
