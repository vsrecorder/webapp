import { beforeEach, describe, expect, it } from "vitest";

import {
  noteTagDeleted,
  noteTagRenamed,
  resetTagOverridesForTest,
  resolveTags,
} from "@app/utils/tagOverrides";

const t = (id: string, name: string) => ({ id, name, color: "" });

beforeEach(resetTagOverridesForTest);

describe("resolveTags", () => {
  it("控えが無ければ渡された配列をそのまま返す", () => {
    const tags = [t("a", "大会用")];
    expect(resolveTags(tags)).toBe(tags);
    expect(resolveTags(null)).toBeNull();
    expect(resolveTags(undefined)).toBeUndefined();
  });

  it("名前を変えたタグは、古い名前で埋め込まれていても新しい名前で返す", () => {
    noteTagRenamed("a", "大会用", "シティ用");

    const tags = [t("a", "大会用"), t("b", "練習用")];
    expect(resolveTags(tags)).toEqual([t("a", "シティ用"), t("b", "練習用")]);
    // 関係の無い配列は作り直さない(メモ化を無駄に壊さない)
    const others = [t("b", "練習用")];
    expect(resolveTags(others)).toBe(others);
  });

  it("続けて変えたら、途中の名前で埋め込まれたものも最新にする", () => {
    noteTagRenamed("a", "大会用", "シティ用");
    noteTagRenamed("a", "シティ用", "CL用");

    expect(resolveTags([t("a", "大会用")])).toEqual([t("a", "CL用")]);
    expect(resolveTags([t("a", "シティ用")])).toEqual([t("a", "CL用")]);
  });

  it("取り直した応答が知らない名前を持っていたら、そちらを優先する", () => {
    // 別の端末でさらに名前を変えたあとの応答を、この端末の古い控えで上書きしない
    noteTagRenamed("a", "大会用", "シティ用");

    const fresh = [t("a", "別端末で付けた名前")];
    expect(resolveTags(fresh)).toBe(fresh);
  });

  it("元の名前へ戻したら、戻した名前はそのまま出す", () => {
    noteTagRenamed("a", "大会用", "シティ用");
    noteTagRenamed("a", "シティ用", "大会用");

    expect(resolveTags([t("a", "シティ用")])).toEqual([t("a", "大会用")]);
    const tags = [t("a", "大会用")];
    expect(resolveTags(tags)).toBe(tags);
  });

  it("削除したタグは外す", () => {
    noteTagDeleted("a");

    expect(resolveTags([t("a", "大会用"), t("b", "練習用")])).toEqual([t("b", "練習用")]);
  });
});
