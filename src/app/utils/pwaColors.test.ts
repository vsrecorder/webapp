import { afterEach, describe, expect, it } from "vitest";

import manifest from "@app/manifest";
import { getSplashBackgroundColor, getStatusBarColor } from "@app/utils/pwaColors";

const HEX = /^#[0-9A-F]{6}$/;
const originalEnv = process.env.ENV;

afterEach(() => {
  if (originalEnv === undefined) delete process.env.ENV;
  else process.env.ENV = originalEnv;
});

describe.each(["dev", "prod"])("PWA の起動画面の色(ENV=%s)", (env) => {
  it("manifest の theme_color はスプラッシュの地色(background_color)と同じ値", () => {
    // WebAPK シェルのスプラッシュはステータスバーを theme_color で塗る。Chrome のスプラッシュは
    // 地色で全画面を塗るので、2つがズレると切り替わりの1フレームでステータスバーがちらつく。
    process.env.ENV = env;
    const m = manifest();
    expect(m.background_color).toBe(getSplashBackgroundColor());
    expect(m.theme_color).toBe(m.background_color);
  });

  it("アプリ表示中のステータスバー色は #RRGGBB で、スプラッシュの地色とは別の色", () => {
    process.env.ENV = env;
    expect(getStatusBarColor()).toMatch(HEX);
    expect(getSplashBackgroundColor()).toMatch(HEX);
    expect(getStatusBarColor()).not.toBe(getSplashBackgroundColor());
  });
});

it("dev と prod で色が違う(環境を一目で見分けるため)", () => {
  process.env.ENV = "dev";
  const dev = [getSplashBackgroundColor(), getStatusBarColor()];
  process.env.ENV = "prod";
  const prod = [getSplashBackgroundColor(), getStatusBarColor()];
  expect(dev[0]).not.toBe(prod[0]);
  expect(dev[1]).not.toBe(prod[1]);
});
