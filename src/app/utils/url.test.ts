import { describe, expect, it } from "vitest";

import { isSameOriginPath, safeExternalUrl } from "@app/utils/url";

describe("safeExternalUrl", () => {
  it("http/https のみ通し、それ以外は undefined にする", () => {
    expect(safeExternalUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeExternalUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(safeExternalUrl("JavaScript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("/relative")).toBeUndefined();
    expect(safeExternalUrl("")).toBeUndefined();
    expect(safeExternalUrl(null)).toBeUndefined();
  });
});

describe("isSameOriginPath", () => {
  const origin = "https://vsrecorder.mobi";

  it("サイト内のパスを通す", () => {
    expect(isSameOriginPath("/", origin)).toBe(true);
    expect(isSameOriginPath("/records/abc?tab=1#x", origin)).toBe(true);
    expect(isSameOriginPath("/users/report/2026-09", origin)).toBe(true);
  });

  it("別オリジンへ解決される値は通さない", () => {
    expect(isSameOriginPath("//evil.example/x", origin)).toBe(false);
    expect(isSameOriginPath("/\\evil.example/x", origin)).toBe(false);
    expect(isSameOriginPath("/\\\\evil.example", origin)).toBe(false);
    expect(isSameOriginPath("https://evil.example/x", origin)).toBe(false);
    expect(isSameOriginPath("https://vsrecorder.mobi/x", origin)).toBe(false);
  });

  it("空・スキーム付き・相対パスは通さない", () => {
    expect(isSameOriginPath("", origin)).toBe(false);
    expect(isSameOriginPath(null, origin)).toBe(false);
    expect(isSameOriginPath(undefined, origin)).toBe(false);
    expect(isSameOriginPath("javascript:alert(1)", origin)).toBe(false);
    expect(isSameOriginPath("records", origin)).toBe(false);
  });
});
