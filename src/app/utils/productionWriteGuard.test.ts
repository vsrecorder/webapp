import { describe, expect, it } from "vitest";

import {
  isBlockedProductionWrite,
  isProductionHost,
  isProductionServer,
  isProductionUpstreamFromNonProduction,
} from "@app/utils/productionWriteGuard";

const LOCAL = { VSRECORDER_DOMAIN: "local.vsrecorder.mobi" };
const PROD = { VSRECORDER_DOMAIN: "vsrecorder.mobi" };

describe("isProductionServer", () => {
  it("VSRECORDER_DOMAIN が本番ドメインのときだけ本番とみなす", () => {
    expect(isProductionServer(PROD)).toBe(true);
    expect(isProductionServer(LOCAL)).toBe(false);
    expect(isProductionServer({})).toBe(false);
  });
});

describe("isProductionHost", () => {
  it("本番ホストだけを本番とみなす", () => {
    expect(isProductionHost("https://vsrecorder.mobi")).toBe(true);
    expect(isProductionHost("https://vsrecorder.mobi:443")).toBe(true);
    expect(isProductionHost(new URL("https://vsrecorder.mobi/api/v1beta/users"))).toBe(true);
    // 別の書き方でも本番へ届くので本番とみなす
    expect(isProductionHost("https://vsrecorder.mobi.")).toBe(true);
    expect(isProductionHost("HTTPS://VSRECORDER.MOBI")).toBe(true);
  });

  it("手元・別サブドメイン・直結の上流・壊れた値は本番ではない", () => {
    expect(isProductionHost("https://local.vsrecorder.mobi")).toBe(false);
    // Grafana の公開ダッシュボード(問い合わせが POST)
    expect(isProductionHost("https://dashboard.vsrecorder.mobi")).toBe(false);
    expect(isProductionHost("http://core-apiserver:8940")).toBe(false);
    expect(isProductionHost("not a url")).toBe(false);
  });
});

describe("isBlockedProductionWrite", () => {
  it("本番以外のサーバから本番への書き込みを止める(2026-09-26 に本番へユーザーが作られた経路)", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "post"]) {
      expect(
        isBlockedProductionWrite({ origin: "https://vsrecorder.mobi", method }, LOCAL),
      ).toBe(true);
    }
  });

  it("読み取りは本番上流でも通す(公開ページを本番データで確かめる用途)", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        isBlockedProductionWrite({ origin: "https://vsrecorder.mobi", method }, LOCAL),
      ).toBe(false);
    }
  });

  it("本番サーバ自身の書き込みは止めない", () => {
    expect(
      isBlockedProductionWrite({ origin: "https://vsrecorder.mobi", method: "POST" }, PROD),
    ).toBe(false);
  });

  it("本番以外への書き込みは止めない", () => {
    expect(
      isBlockedProductionWrite({ origin: "https://local.vsrecorder.mobi", method: "POST" }, LOCAL),
    ).toBe(false);
    expect(
      isBlockedProductionWrite(
        { origin: "https://dashboard.vsrecorder.mobi", method: "POST" },
        LOCAL,
      ),
    ).toBe(false);
  });
});

describe("isProductionUpstreamFromNonProduction", () => {
  it("手元のサーバが本番を上流にしているときだけ真", () => {
    expect(isProductionUpstreamFromNonProduction("https://vsrecorder.mobi", LOCAL)).toBe(true);
    expect(isProductionUpstreamFromNonProduction("https://local.vsrecorder.mobi", LOCAL)).toBe(
      false,
    );
    expect(isProductionUpstreamFromNonProduction("https://vsrecorder.mobi", PROD)).toBe(false);
  });
});
