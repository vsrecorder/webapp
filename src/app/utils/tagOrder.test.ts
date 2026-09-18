import { describe, expect, it } from "vitest";

import { sortTagsPresetFirst } from "@app/utils/tagOrder";

import { TagType } from "@app/types/tag";

const tag = (name: string, preset_flg: boolean): TagType =>
  ({
    id: name,
    created_at: new Date("2026-09-01T00:00:00Z"),
    name,
    color: preset_flg ? "#f5a524" : "",
    text_color: "",
    preset_flg,
  }) as TagType;

const names = (tags: TagType[]) => tags.map((t) => t.name);

describe("sortTagsPresetFirst", () => {
  it("プリセット(デッキでは ACE SPEC)を先頭に寄せる", () => {
    const tags = [
      tag("大会用", false),
      tag("シークレットボックス", true),
      tag("調整中", false),
    ];

    expect(names(sortTagsPresetFirst(tags))).toEqual([
      "シークレットボックス",
      "大会用",
      "調整中",
    ]);
  });

  it("同じ群の中の並びは受け取ったままにする", () => {
    const tags = [
      tag("テスト6", false),
      tag("テスト2", false),
      tag("ACE SPEC", true),
      tag("テスト5", false),
    ];

    expect(names(sortTagsPresetFirst(tags))).toEqual([
      "ACE SPEC",
      "テスト6",
      "テスト2",
      "テスト5",
    ]);
  });

  it("元の配列は変えない", () => {
    const tags = [tag("大会用", false), tag("ACE SPEC", true)];
    sortTagsPresetFirst(tags);

    expect(names(tags)).toEqual(["大会用", "ACE SPEC"]);
  });

  it("空・未設定はそのまま空配列にする(タグ行の場所取りの判定を変えない)", () => {
    expect(sortTagsPresetFirst([])).toEqual([]);
    expect(sortTagsPresetFirst(undefined)).toEqual([]);
    expect(sortTagsPresetFirst(null)).toEqual([]);
  });
});
