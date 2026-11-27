import { afterEach, describe, expect, it, vi } from "vitest";

import { generateNonce, pageCsp, staticCsp } from "@app/utils/csp";

afterEach(() => {
  vi.unstubAllEnvs();
});

// "script-src 'self' …" のような 1 行を、ディレクティブ名 → 値の配列にする
function parse(csp: string): Map<string, string[]> {
  return new Map(
    csp.split("; ").map((directive) => {
      const [name, ...values] = directive.split(" ");
      return [name, values];
    }),
  );
}

describe("pageCsp", () => {
  const nonce = "AAAAAAAAAAAAAAAAAAAAAA==";
  const csp = parse(pageCsp(nonce));

  it("script-src は nonce と 'strict-dynamic' を持ち、'unsafe-inline' を持たない", () => {
    const scriptSrc = csp.get("script-src");

    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("'strict-dynamic' を知らないブラウザのために、'self' と外部スクリプトのホストを残す", () => {
    const scriptSrc = csp.get("script-src");

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("https://www.googletagmanager.com");
    expect(scriptSrc).toContain("https://apis.google.com");
  });

  it("'unsafe-eval' は開発時だけ付き、本番では付かない", async () => {
    // isDev はモジュールの読み込み時に決まるので、NODE_ENV を変えて読み込み直す
    const load = async (nodeEnv: string) => {
      vi.resetModules();
      vi.stubEnv("NODE_ENV", nodeEnv);
      return import("@app/utils/csp");
    };

    const development = await load("development");
    expect(development.pageCsp(nonce)).toContain("'unsafe-eval'");
    expect(development.staticCsp()).toContain("'unsafe-eval'");

    const production = await load("production");
    expect(production.pageCsp(nonce)).not.toContain("'unsafe-eval'");
    expect(production.staticCsp()).not.toContain("'unsafe-eval'");
    expect(production.pageCsp(nonce)).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("script-src 以外は、これまでの絞り込みを保つ", () => {
    expect(csp.get("default-src")).toEqual(["'self'"]);
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("worker-src")).toEqual(["'self'"]);
    expect(csp.get("img-src")).toContain("https://xx8nnpgt.user.webaccel.jp");
    expect(csp.get("connect-src")).toContain("https://*.googleapis.com");
    expect(csp.get("frame-src")).toContain("https://*.firebaseapp.com");
  });

  it.each([
    ["空文字", ""],
    ["引用符で script-src を閉じようとする値", "abc' 'unsafe-inline"],
    ["セミコロンで別のディレクティブを足そうとする値", "abc; script-src *"],
    ["空白を含む値", "abc def"],
    ["改行を含む値", "abc\r\nX-Injected: 1"],
  ])("base64 でない nonce(%s)は受け付けない", (_name, bad) => {
    expect(() => pageCsp(bad)).toThrow();
  });
});

describe("staticCsp", () => {
  const csp = parse(staticCsp());

  it("script-src は nonce も 'unsafe-inline' も 'strict-dynamic' も持たない", () => {
    const scriptSrc = csp.get("script-src") ?? [];

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc.some((value) => value.startsWith("'nonce-"))).toBe(false);
  });

  it("script-src 以外はページの CSP と同じ", () => {
    const page = parse(pageCsp("AAAAAAAAAAAAAAAAAAAAAA=="));

    for (const [name, values] of csp) {
      if (name === "script-src") continue;
      expect(page.get(name)).toEqual(values);
    }
    expect([...page.keys()]).toEqual([...csp.keys()]);
  });
});

describe("generateNonce", () => {
  it("16 バイト(128 ビット)の乱数を base64 にした値を返す", () => {
    const nonce = generateNonce();

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(Buffer.from(nonce, "base64")).toHaveLength(16);
  });

  it("呼ぶたびに違う値を返す", () => {
    const nonces = new Set(Array.from({ length: 1000 }, () => generateNonce()));

    expect(nonces.size).toBe(1000);
  });

  it("pageCsp がそのまま受け付ける", () => {
    for (let i = 0; i < 100; i++) {
      expect(() => pageCsp(generateNonce())).not.toThrow();
    }
  });
});
