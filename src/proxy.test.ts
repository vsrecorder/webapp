import { describe, expect, it } from "vitest";

import { NextRequest } from "next/server";

import { config, proxy } from "./proxy";

/*
 * proxy(旧 middleware)が、ページの応答に要求ごとの nonce を載せた CSP を付けること。
 *
 * NextResponse.next({ request: { headers } }) で差し替えた要求ヘッダは、応答の
 * x-middleware-request-<名前> ヘッダとして Next.js へ渡る(x-middleware-override-headers に
 * 名前の一覧)。ここではそれを読んで、描画側へ届く値を確かめる。
 */
function get(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`https://vsrecorder.mobi${path}`, { headers }));
}

function nonceIn(csp: string | null): string | undefined {
  return csp?.match(/'nonce-([^']+)'/)?.[1];
}

describe("proxy の Content-Security-Policy", () => {
  it("ページの応答に、nonce を載せた CSP を付ける", () => {
    const res = get("/");
    const csp = res.headers.get("Content-Security-Policy");

    expect(nonceIn(csp)).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("描画側(Next.js と layout.tsx)へ、応答と同じ nonce を渡す", () => {
    const res = get("/cityleague_results");
    const nonce = nonceIn(res.headers.get("Content-Security-Policy"));

    expect(nonce).toBeDefined();
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(
      res.headers.get("Content-Security-Policy"),
    );
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-nonce");
    expect(res.headers.get("x-middleware-override-headers")).toContain("content-security-policy");
  });

  it("nonce は要求ごとに変わる", () => {
    const nonces = new Set(
      Array.from({ length: 50 }, () => nonceIn(get("/").headers.get("Content-Security-Policy"))),
    );

    expect(nonces.size).toBe(50);
  });

  it("利用者が送ってきた x-nonce と CSP は使わず、自分で作った値で上書きする", () => {
    const res = get("/", {
      "x-nonce": "attacker",
      "content-security-policy": "script-src 'nonce-attacker' 'unsafe-inline' *",
    });
    const nonce = nonceIn(res.headers.get("Content-Security-Policy"));

    expect(nonce).not.toBe("attacker");
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(res.headers.get("x-middleware-request-content-security-policy")).not.toContain(
      "attacker",
    );
  });

  it("ほかの要求ヘッダ(Cookie など)は、そのまま描画側へ渡す", () => {
    const res = get("/", { cookie: "a=1", "accept-language": "ja" });

    expect(res.headers.get("x-middleware-request-cookie")).toBe("a=1");
    expect(res.headers.get("x-middleware-request-accept-language")).toBe("ja");
  });

  it("流入元の Cookie を保存する応答にも CSP が付く", () => {
    const res = get("/?utm_source=x&utm_medium=social");

    expect(res.cookies.get("vsr_attr")).toBeDefined();
    expect(nonceIn(res.headers.get("Content-Security-Policy"))).toBeDefined();
  });
});

describe("proxy のログイン必須ページのガード(CSP を足しても変わらないこと)", () => {
  it("未ログインでログイン必須のページを開くと、/ へ 307 で返す", () => {
    const res = get("/records/create?pd=1");

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("next")).toBe("/records/create?pd=1");
  });

  it("未ログインでも、公開ページはそのまま通す", () => {
    const res = get("/shared_decks");

    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("proxy の対象(matcher)", () => {
  // Next.js は matcher を「^」と「$」で挟んだ正規表現として評価する
  const pattern = new RegExp(`^${config.matcher[0]}$`);

  it.each([
    "/",
    "/records",
    "/records/create",
    "/cityleague_results/2027s1",
    "/shared_decks/01JABC",
    // 存在しないパスの 404 ページも HTML なので、nonce が要る
    "/wp-login.php",
    "/.env",
    "/users/abc.def",
  ])("%s はページとして通す", (path) => {
    expect(pattern.test(path)).toBe(true);
  });

  it.each([
    "/api/users/abc",
    "/_next/static/chunks/main.js",
    "/_next/image",
    "/sw.js",
    "/icon.png",
    "/apple-icon.png",
    "/icon-192x192.png",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/favicon.ico",
  ])("%s は通さない", (path) => {
    expect(pattern.test(path)).toBe(false);
  });
});
