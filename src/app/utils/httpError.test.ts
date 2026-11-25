import { describe, expect, it } from "vitest";

import { httpErrorMessage } from "@app/utils/httpError";

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/*
 * 失敗のトーストに出す1行。以前は各画面が `Message: ${(await res.json()).message}` と書いていて、
 * message を持たない失敗(BFF 自身の失敗・nginx の HTML)で文言が崩れていた。
 */
describe("httpErrorMessage", () => {
  it("core-apiserver の失敗(message)は、これまでどおりの形で出す", async () => {
    expect(await httpErrorMessage(jsonResponse({ message: "bad request" }, 400))).toBe(
      "HTTP error: 400 Message: bad request",
    );
  });

  it("BFF 自身の失敗(error)でも undefined にならない", async () => {
    const message = await httpErrorMessage(jsonResponse({ error: "invalid id" }, 400));

    expect(message).toBe("HTTP error: 400 Message: invalid id");
    expect(message).not.toContain("undefined");
  });

  it("ログイン切れの 401 は、ログインし直すよう添える", async () => {
    expect(await httpErrorMessage(jsonResponse({ error: "unauthorized" }, 401))).toBe(
      "ログインし直してください (HTTP error: 401 Message: unauthorized)",
    );
  });

  it("nginx の HTML(流量制限の 429)でも例外にせず、待つよう添える", async () => {
    const res = new Response("<html><body>429 Too Many Requests</body></html>", {
      status: 429,
      headers: { "content-type": "text/html" },
    });

    expect(await httpErrorMessage(res)).toBe(
      "アクセスが集中しています。少し待ってからもう一度お試しください (HTTP error: 429)",
    );
  });

  it("HTML の 502 / 503 / 504 は、繋がらなかったと伝える", async () => {
    for (const status of [502, 503, 504]) {
      const res = new Response("<html></html>", { status });

      expect(await httpErrorMessage(res)).toBe(
        `サーバーに繋がりませんでした。少し待ってからもう一度お試しください (HTTP error: ${status})`,
      );
    }
  });

  it("説明が日本語(アップデート中の案内)なら、重ねて案内を足さない", async () => {
    const res = jsonResponse(
      { error: "ただいまアップデート中です。少し待ってからもう一度お試しください", code: "UPSTREAM_UNAVAILABLE" },
      503,
    );

    expect(await httpErrorMessage(res)).toBe(
      "HTTP error: 503 Message: ただいまアップデート中です。少し待ってからもう一度お試しください",
    );
  });

  it("本文が空・説明が文字列でない・JSON が null でも、状態コードだけで出す", async () => {
    expect(await httpErrorMessage(new Response(null, { status: 500 }))).toBe("HTTP error: 500");
    expect(await httpErrorMessage(jsonResponse({ message: { code: 1 } }, 500))).toBe(
      "HTTP error: 500",
    );
    expect(await httpErrorMessage(jsonResponse({ message: "  " }, 500))).toBe("HTTP error: 500");
    expect(await httpErrorMessage(jsonResponse(null, 500))).toBe("HTTP error: 500");
  });

  it("message が空でも error があればそちらを使う", async () => {
    expect(await httpErrorMessage(jsonResponse({ message: "", error: "too large" }, 413))).toBe(
      "HTTP error: 413 Message: too large",
    );
  });
});
