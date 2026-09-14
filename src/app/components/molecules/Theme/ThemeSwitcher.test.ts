import { describe, expect, it } from "vitest";

import { resolveTriggerAppearance } from "@app/components/molecules/Theme/ThemeSwitcher";

describe("resolveTriggerAppearance", () => {
  it("ライトを選んでいればライト", () => {
    expect(resolveTriggerAppearance("light", "light")).toBe("light");
  });

  it("ダークを選んでいればダーク", () => {
    expect(resolveTriggerAppearance("dark", "dark")).toBe("dark");
  });

  it("システム設定に合わせているときは、実際に適用されている明暗を出す", () => {
    // 端末アイコンだと、画面の見た目(明るい/暗い)とボタンの印が食い違う
    expect(resolveTriggerAppearance("system", "dark")).toBe("dark");
    expect(resolveTriggerAppearance("system", "light")).toBe("light");
  });

  it("明暗がまだ決まっていなければライト扱いにする", () => {
    expect(resolveTriggerAppearance("system", undefined)).toBe("light");
  });

  it("選んだモードがライト/ダークなら、解決結果には引きずられない", () => {
    // 選択そのものを表す(システム以外はユーザーの指定が優先される)
    expect(resolveTriggerAppearance("light", "dark")).toBe("light");
    expect(resolveTriggerAppearance("dark", "light")).toBe("dark");
  });
});
