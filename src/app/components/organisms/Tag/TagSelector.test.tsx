// @vitest-environment jsdom
import { useState } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TagSelector from "@app/components/organisms/Tag/TagSelector";

import { TagPresetCategory, TagType } from "@app/types/tag";
import { resetTagOverridesForTest } from "@app/utils/tagOverrides";

const tag = (id: string, name: string, preset_flg: boolean): TagType =>
  ({
    id,
    created_at: new Date("2026-09-01T00:00:00Z"),
    name,
    color: preset_flg ? "#f5a524" : "",
    text_color: "",
    preset_flg,
  }) as TagType;

// jsdom は ResizeObserver を持たない。候補行の HScrollRow が溢れ判定に使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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

afterEach(() => {
  cleanup();
  resetTagOverridesForTest();
});

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

  it("読み込み中も候補・プリセットの行を空けておく", async () => {
    // 取得が返った瞬間に候補行が生まれると、開いたアコーディオンの中身が
    // そのぶん伸びて跳ねる(実測: 中身 74px → 190.5px)。行の数は最初から最後まで変えない
    const pending: { url: string; send: (body: TagType[]) => void }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string) =>
          new Promise<Response>((resolve) => {
            pending.push({
              url: String(url),
              send: (body) =>
                resolve(
                  new Response(JSON.stringify(body), {
                    headers: { "content-type": "application/json" },
                  }),
                ),
            });
          }),
      ),
    );

    const { container } = render(<Harness />);
    const root = container.querySelector(".flex.flex-col.gap-2")!;
    const rowsWhileLoading = root.children.length;

    // 取得結果に依らない見出しは骨格に置き換えず、そのまま出す
    expect(screen.getByText("ACE SPEC・プリセット")).toBeTruthy();
    // 候補の場所はチップの骨格で取っておく
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    pending.forEach((req) => req.send(req.url.includes("/presets") ? ACESPEC : MINE));
    await waitFor(() => chip("大会用"));

    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
    expect(root.children.length).toBe(rowsWhileLoading);
  });

  it("付与済みのタグは、一覧が届く前でも knownTags から描く", async () => {
    // 編集モーダルは付与済みのタグを持って開く。一覧待ちでチップが後から生えると、
    // チップが2行に折り返した瞬間に枠が伸びる(実測: 24px → 52px、モーダルごと上へずれる)
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <TagSelector
          selectedTagIds={["mine-1", "ace-1"]}
          onChange={() => {}}
          knownTags={[...MINE, ...ACESPEC]}
        />
      </SWRConfig>,
    );

    expect(screen.getByText("大会用")).toBeTruthy();
    expect(screen.getByText("シークレットボックス")).toBeTruthy();
  });

  it("自分のタグが1つも無くても候補の行は残す", async () => {
    // 0件だけ行が消えると、タグを初めて作った瞬間に下がずれる
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const body = String(url).includes("/presets") ? ACESPEC : [];
        return new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const { container } = render(<Harness />);
    await waitFor(() => chip("マスターボール"));

    const root = container.querySelector(".flex.flex-col.gap-2")!;
    // 見出し・付与済み・入力欄・自分のタグ・プリセット の5行
    expect(root.children.length).toBe(5);
    expect(screen.getByText("入力すると自分のタグを作成できます")).toBeTruthy();
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

  describe("管理モードでの名前の変更", () => {
    // PUT /api/tags/:id を受けて、以降の GET /api/tags に反映する
    function stubTagsApi(putStatus = 200) {
      let mine = [...MINE, tag("mine-2", "練習用", false)];
      const puts: { url: string; body: unknown }[] = [];

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) => {
          const json = (body: unknown, status = 200) =>
            new Response(JSON.stringify(body), {
              status,
              headers: { "content-type": "application/json" },
            });

          if (init?.method === "PUT") {
            const body = JSON.parse(String(init.body));
            puts.push({ url: String(url), body });
            if (putStatus !== 200) return json({ error: "conflict" }, putStatus);

            const id = String(url).split("/").pop();
            mine = mine.map((t) => (t.id === id ? { ...t, name: body.name } : t));
            return json(mine.find((t) => t.id === id));
          }

          return json(String(url).includes("/presets") ? ACESPEC : mine);
        }),
      );

      return puts;
    }

    async function openRename(container: HTMLElement, name: string) {
      await waitFor(() => chip(name));
      fireEvent.click(screen.getByText("タグを管理"));
      fireEvent.click(chip(`タグ「${name}」の名前を変更`));
      return container.querySelector("input")!;
    }

    it("タグをタップして名前を変えられる(色は引き継ぐ)", async () => {
      const puts = stubTagsApi();
      const { container } = render(<Harness />);

      const input = await openRename(container, "大会用");
      expect(input.value).toBe("大会用");

      fireEvent.change(input, { target: { value: " シティ用 " } });
      fireEvent.click(chip("変更を保存"));

      // 一覧へ戻り、新しい名前で並ぶ
      await waitFor(() => chip("タグ「シティ用」の名前を変更"));
      expect(puts).toEqual([
        { url: "/api/tags/mine-1", body: { name: "シティ用", color: "" } },
      ]);
    });

    it("他のタグ・プリセットと同じ名前には変えられない", async () => {
      // かな違いも同名扱い。新規作成の同名判定と揃える
      const puts = stubTagsApi();
      const { container } = render(<Harness />);

      const input = await openRename(container, "大会用");

      fireEvent.change(input, { target: { value: "練習用" } });
      expect(screen.getByText("同じ名前のタグが既にあります")).toBeTruthy();

      fireEvent.change(input, { target: { value: "ますたーぼーる" } });
      expect(screen.getByText("同じ名前のタグが既にあります")).toBeTruthy();

      fireEvent.keyDown(input, { key: "Enter" });
      expect(puts).toEqual([]);
    });

    it("上流に同名で断られたら入力欄に出し、編集を続けられる", async () => {
      const puts = stubTagsApi(409);
      const { container } = render(<Harness />);

      const input = await openRename(container, "大会用");
      fireEvent.change(input, { target: { value: "シティ用" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => screen.getByText("同じ名前のタグが既にあります"));
      expect(puts.length).toBe(1);
      expect(container.querySelector("input")!.value).toBe("シティ用");
    });

    it("名前を変えずに保存したら何も送らずに一覧へ戻る", async () => {
      const puts = stubTagsApi();
      const { container } = render(<Harness />);

      await openRename(container, "大会用");
      fireEvent.click(chip("変更を保存"));

      await waitFor(() => chip("タグ「大会用」の名前を変更"));
      expect(puts).toEqual([]);
    });
  });
});
