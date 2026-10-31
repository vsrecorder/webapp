import { describe, expect, it } from "vitest";

import {
  buildSignInUrl,
  parseNextPath,
  resolveSignInReturnPath,
  signInQuery,
} from "@app/utils/signInReturn";

describe("parseNextPath", () => {
  it("サイト内のパスとクエリはそのまま使う", () => {
    expect(parseNextPath("/records/create")).toBe("/records/create");
    expect(parseNextPath("/records/create?pd=01M667EZXZS19MXSFZFE8MFA90")).toBe(
      "/records/create?pd=01M667EZXZS19MXSFZFE8MFA90",
    );
  });

  // ログイン後に外部サイトへ飛ばせてしまう(オープンリダイレクト)
  it("別のホストを指すものは捨てる", () => {
    expect(parseNextPath("https://evil.example/")).toBeNull();
    expect(parseNextPath("//evil.example/records")).toBeNull();
    expect(parseNextPath("/\\evil.example/records")).toBeNull();
    expect(parseNextPath("javascript:alert(1)")).toBeNull();
  });

  // 先頭の判定は通るが、ドットの区間が畳まれると `//evil.example` になるもの
  it("正規化すると別のホストを指すものも捨てる", () => {
    expect(parseNextPath("/.//evil.example")).toBeNull();
    expect(parseNextPath("/..//evil.example")).toBeNull();
    expect(parseNextPath("/a/..//evil.example")).toBeNull();
    expect(parseNextPath("/%2e//evil.example")).toBeNull();
    expect(parseNextPath("/\t/evil.example")).toBeNull();
  });

  it("途中に // があるだけのパスは使う", () => {
    expect(parseNextPath("/records//abc")).toBe("/records//abc");
  });

  it("トップ自体は戻り先にしない", () => {
    expect(parseNextPath("/")).toBeNull();
    expect(parseNextPath("/?next=%2Frecords")).toBeNull();
  });

  it("文字列でないもの・空・長すぎるものは捨てる", () => {
    expect(parseNextPath(undefined)).toBeNull();
    expect(parseNextPath(["/records"])).toBeNull();
    expect(parseNextPath("")).toBeNull();
    expect(parseNextPath("/" + "a".repeat(1024))).toBeNull();
  });

  // 非ASCIIは正規化で1文字が9文字になる。入力が短くても、膨らんだ後の長さで判定する
  it("正規化で長くなりすぎるものも捨てる", () => {
    expect(parseNextPath("/" + "あ".repeat(200))).toBeNull();
    expect(parseNextPath("/" + "あ".repeat(100))).toBe("/" + "%E3%81%82".repeat(100));
  });

  it("ハッシュは落とす", () => {
    expect(parseNextPath("/records/abc#match")).toBe("/records/abc");
  });
});

// proxy.ts がセッション Cookie の無いアクセスをトップへ返すときに使う
describe("signInQuery", () => {
  it("パスとクエリを next に入れる(先頭の ? は付けない)", () => {
    expect(signInQuery("/records/create?pd=abc")).toBe("next=%2Frecords%2Fcreate%3Fpd%3Dabc");
  });

  it("戻り先にできなければ空", () => {
    expect(signInQuery("/")).toBe("");
    expect(signInQuery("//evil.example")).toBe("");
  });
});

describe("buildSignInUrl", () => {
  // push 通知のタップ計測(?pd=)をログインの後まで持ち越すのが目的
  it("パスとクエリを next に入れる", () => {
    expect(buildSignInUrl("/records/create", { pd: "01M667EZXZS19MXSFZFE8MFA90" })).toBe(
      "/?next=%2Frecords%2Fcreate%3Fpd%3D01M667EZXZS19MXSFZFE8MFA90",
    );
  });

  it("クエリが無ければパスだけ", () => {
    expect(buildSignInUrl("/users/report/weeks/2026-10-19")).toBe(
      "/?next=%2Fusers%2Freport%2Fweeks%2F2026-10-19",
    );
    expect(buildSignInUrl("/calendar", {})).toBe("/?next=%2Fcalendar");
  });

  it("同じキーが複数あれば全部残し、undefined は飛ばす", () => {
    expect(buildSignInUrl("/decks", { tag: ["a", "b"], empty: undefined })).toBe(
      "/?next=%2Fdecks%3Ftag%3Da%26tag%3Db",
    );
  });

  it("戻り先にできないパスなら、ただのトップ", () => {
    expect(buildSignInUrl("/")).toBe("/");
    expect(buildSignInUrl("//evil.example")).toBe("/");
  });
});

describe("resolveSignInReturnPath", () => {
  it("next があればそれを戻り先にする", () => {
    expect(
      resolveSignInReturnPath("/", "?next=%2Frecords%2Fcreate%3Fpd%3D01M667EZXZS19MXSFZFE8MFA90"),
    ).toBe("/records/create?pd=01M667EZXZS19MXSFZFE8MFA90");
  });

  it("next が無い・使えないときは今いるパス", () => {
    expect(resolveSignInReturnPath("/shared_decks", "")).toBe("/shared_decks");
    expect(resolveSignInReturnPath("/", "?next=https%3A%2F%2Fevil.example")).toBe("/");
  });

  // buildSignInUrl で作った URL を、ログインボタンが同じ戻り先に読めること
  it("buildSignInUrl と往復できる", () => {
    const url = new URL(buildSignInUrl("/records/create", { pd: "x", deck_id: "d1" }), "https://vsrecorder.mobi");
    expect(resolveSignInReturnPath(url.pathname, url.search)).toBe(
      "/records/create?pd=x&deck_id=d1",
    );
  });
});
