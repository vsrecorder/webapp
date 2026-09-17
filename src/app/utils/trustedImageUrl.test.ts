import { describe, expect, it } from "vitest";

import { CDN_ORIGIN } from "@app/utils/cdn";
import { isTrustedImageUrl } from "@app/utils/trustedImageUrl";

describe("isTrustedImageUrl", () => {
  it("CDN のアイコンとデッキ画像を通す", () => {
    expect(isTrustedImageUrl(`${CDN_ORIGIN}/images/users/default_icon.png`)).toBe(true);
    expect(isTrustedImageUrl(`${CDN_ORIGIN}/images/decks/abcdef.jpg`)).toBe(true);
  });

  it("Google / X のアイコンを通す(大文字のホスト名も同じ扱い)", () => {
    expect(isTrustedImageUrl("https://lh3.googleusercontent.com/a/xxx=s96-c")).toBe(true);
    expect(isTrustedImageUrl("https://PBS.twimg.com/profile_images/1/x.jpg")).toBe(true);
  });

  it("許可していないホストは通さない", () => {
    expect(isTrustedImageUrl("https://example.com/a.png")).toBe(false);
    expect(isTrustedImageUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isTrustedImageUrl("https://core-apiserver:8940/api/v1beta/users")).toBe(false);
    // 許可ホストをサブドメインや末尾一致で真似たもの
    expect(isTrustedImageUrl("https://lh3.googleusercontent.com.evil.example/a.png")).toBe(false);
    expect(isTrustedImageUrl("https://evil.example/?u=https://lh3.googleusercontent.com/")).toBe(false);
  });

  it("https 以外のスキームと認証情報付きの URL は通さない", () => {
    expect(isTrustedImageUrl("http://lh3.googleusercontent.com/a.png")).toBe(false);
    expect(isTrustedImageUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedImageUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isTrustedImageUrl("https://user:pass@lh3.googleusercontent.com/a.png")).toBe(false);
  });

  it("文字列でない値・空文字・URL として読めない値は通さない", () => {
    expect(isTrustedImageUrl(undefined)).toBe(false);
    expect(isTrustedImageUrl(null)).toBe(false);
    expect(isTrustedImageUrl(123)).toBe(false);
    expect(isTrustedImageUrl("")).toBe(false);
    expect(isTrustedImageUrl("not a url")).toBe(false);
    expect(isTrustedImageUrl("/images/users/a.png")).toBe(false);
  });
});
