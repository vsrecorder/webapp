import { describe, expect, it } from "vitest";

import { readJsonBody } from "@app/utils/requestBody";
import { BadRequestError, upstreamErrorResponse } from "@app/utils/upstream";

function requestWith(body: string): Request {
  return new Request("https://example.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("readJsonBody", () => {
  it("JSON のオブジェクトと配列を返す", async () => {
    await expect(readJsonBody(requestWith('{"name":"x"}'))).resolves.toEqual({ name: "x" });
    await expect(readJsonBody(requestWith("[1,2]"))).resolves.toEqual([1, 2]);
  });

  it("壊れた JSON は BadRequestError にする", async () => {
    await expect(readJsonBody(requestWith("{oops"))).rejects.toBeInstanceOf(BadRequestError);
    await expect(readJsonBody(requestWith(""))).rejects.toBeInstanceOf(BadRequestError);
  });

  it("オブジェクト以外の JSON は BadRequestError にする", async () => {
    await expect(readJsonBody(requestWith("null"))).rejects.toBeInstanceOf(BadRequestError);
    await expect(readJsonBody(requestWith("123"))).rejects.toBeInstanceOf(BadRequestError);
    await expect(readJsonBody(requestWith('"text"'))).rejects.toBeInstanceOf(BadRequestError);
  });

  it("upstreamErrorResponse が 400 に変換する", async () => {
    const error = await readJsonBody(requestWith("{oops")).catch((e) => e);
    const response = upstreamErrorResponse(error);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "request body is not valid JSON" });
  });
});
