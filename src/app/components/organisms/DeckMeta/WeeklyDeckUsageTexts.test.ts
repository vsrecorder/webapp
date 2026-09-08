import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const dir = fileURLToPath(new URL(".", import.meta.url));
const texts = readFileSync(`${dir}WeeklyDeckUsageTexts.tsx`, "utf8");
const panel = readFileSync(`${dir}WeeklyDeckUsagePanel.tsx`, "utf8");
const skeleton = readFileSync(`${dir}Skeleton/WeeklyDeckUsagePanelSkeleton.tsx`, "utf8");

/*
 * 端末幅によって折り返しの回数が変わる固定文言。骨格側でスケルトンのバーに置き換えると、
 * 行数が幅ごとに変わるぶん骨格と実体の高さが食い違う(実測: 320px で母集団の注記が
 * 5行→7行になり 27.5px ズレた)。両方が同じ部品を描いていることで守る。
 */
const SHARED_TEXTS = [
  "プラットフォーム全体の週次デッキ使用率",
  "※スタンダードの記録のみを集計しています",
  "※ポケモン未設定の対戦はデッキ名から推測して集計しています",
  "「その他」を含む全体件数を分母に算出しています",
  "使用率ランキング",
];

describe("週次デッキ使用率パネルの固定文言", () => {
  it("WeeklyDeckUsageTexts が持っている", () => {
    for (const text of SHARED_TEXTS) {
      expect(texts, `${text} が共有部品から消えている`).toContain(text);
    }
  });

  it("実体にも骨格にも直書きしない(片方だけ追随して高さがズレるため)", () => {
    for (const text of SHARED_TEXTS) {
      expect(panel, `${text} が WeeklyDeckUsagePanel に直書きされている`).not.toContain(text);
      expect(skeleton, `${text} が骨格に直書きされている`).not.toContain(text);
    }
  });
});
