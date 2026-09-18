// @vitest-environment jsdom
import { useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TagSelector from "@app/components/organisms/Tag/TagSelector";

import { TagPresetCategory, TagType } from "@app/types/tag";

const tag = (id: string, name: string, preset_flg: boolean): TagType =>
  ({
    id,
    created_at: new Date("2026-09-01T00:00:00Z"),
    name,
    color: preset_flg ? "#f5a524" : "",
    text_color: "",
    preset_flg,
  }) as TagType;

const MINE = [tag("mine-1", "大会用", false)];
const ACESPEC = [
  tag("ace-1", "シークレットボックス", true),
  tag("ace-2", "マスターボール", true),
];

// /api/tags は自分のタグ、/api/tags/presets?category=... はプリセット
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = String(url).includes("/presets") ? ACESPEC : MINE;
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
});

afterEach(cleanup);

// 付与するIDの集合は親が持つ。選択の結果をそのまま読めるよう、テスト側で持って表示する
function Harness({ presetCategory }: { presetCategory?: TagPresetCategory }) {
  const [ids, setIds] = useState<string[]>([]);

  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <div data-testid="selected">{ids.join(",")}</div>
      <TagSelector
        selectedTagIds={ids}
        onChange={setIds}
        presetCategory={presetCategory}
      />
    </SWRConfig>
  );
}

const selected = () => screen.getByTestId("selected").textContent;
const chip = (name: string) => screen.getByRole("button", { name });

describe("TagSelector", () => {
  it("ACE SPEC プリセットは1つしか付かない(選び直すと差し替わる)", async () => {
    // デッキに入る ACE SPEC は1枚。2枚目を選べると、実物と食い違うタグが残ってしまう
    render(<Harness />);
    await waitFor(() => chip("シークレットボックス"));

    fireEvent.click(chip("シークレットボックス"));
    expect(selected()).toBe("ace-1");

    fireEvent.click(chip("マスターボール"));
    expect(selected()).toBe("ace-2");
  });

  it("選択中の表示はプリセット(ACE SPEC)を先頭にする", async () => {
    // 付与するIDの並びは選択順のままにし、見せ方だけ揃える。
    // デッキ一覧カード・デッキ詳細モーダルも同じ規則(sortTagsPresetFirst)で並べている
    const { container } = render(<Harness />);
    await waitFor(() => chip("大会用"));

    fireEvent.click(chip("大会用"));
    fireEvent.click(chip("シークレットボックス"));
    expect(selected()).toBe("mine-1,ace-1");

    // 選択中のチップは入力欄より前に並ぶ
    const head = container.innerHTML.split("<input")[0];
    expect(head).toContain("シークレットボックス");
    expect(head).toContain("大会用");
    expect(head.indexOf("シークレットボックス")).toBeLessThan(head.indexOf("大会用"));
  });

  it("タグを付けていなくてもチップ1行ぶんの場所を空けておく", async () => {
    // 1つ目を付けた瞬間に行が生まれると、入力欄から下(候補・プリセット)がまとめて下がる
    const { container } = render(<Harness />);
    await waitFor(() => chip("大会用"));

    // 付与済みの行は入力欄より前にある
    const head = container.innerHTML.split("<input")[0];
    expect(head).toContain("min-h-6");
  });

  it("差し替わるのは同じ群のプリセットだけで、自分のタグは残る", async () => {
    render(<Harness />);
    await waitFor(() => chip("大会用"));

    fireEvent.click(chip("大会用"));
    fireEvent.click(chip("シークレットボックス"));
    expect(selected()).toBe("mine-1,ace-1");

    fireEvent.click(chip("マスターボール"));
    expect(selected()).toBe("mine-1,ace-2");
  });
});
