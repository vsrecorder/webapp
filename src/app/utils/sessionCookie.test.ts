import { describe, expect, it } from "vitest";

import { hasSessionCookie } from "@app/utils/sessionCookie";

describe("hasSessionCookie", () => {
  it("本番の Cookie 名(__Secure- 付き)を見つける", () => {
    expect(hasSessionCookie([{ name: "__Secure-authjs.session-token" }])).toBe(true);
  });

  it("開発の Cookie 名(__Secure- 無し)も見つける", () => {
    expect(hasSessionCookie([{ name: "authjs.session-token" }])).toBe(true);
  });

  it("分割された Cookie(.0 / .1)も見つける", () => {
    expect(
      hasSessionCookie([
        { name: "__Secure-authjs.session-token.0" },
        { name: "__Secure-authjs.session-token.1" },
      ]),
    ).toBe(true);
  });

  it("紛らわしい別の Cookie は数えない", () => {
    expect(
      hasSessionCookie([
        { name: "vsr_attr" },
        { name: "authjs.session-token-other" },
        { name: "my-authjs.session-token" },
      ]),
    ).toBe(false);
  });

  it("Cookie が無ければ false", () => {
    expect(hasSessionCookie([])).toBe(false);
  });
});
