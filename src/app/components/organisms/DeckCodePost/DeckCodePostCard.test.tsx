// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DeckCodePostCard from "@app/components/organisms/DeckCodePost/DeckCodePostCard";

import { DeckCodePostType } from "@app/types/deck_code_post";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const POST: DeckCodePostType = {
  id: "post-1",
  published_at: "2026-09-01T00:00:00Z",
  unpublished_at: "0001-01-01T00:00:00Z",
  hidden: false,
  user: { id: "u1", name: "テスト", image_url: "", designation_tier: 0 },
  deck_id: "d1",
  deck_name: "リザードンex",
  pokemon_sprites: [
    { id: "0006", position: 1 },
    { id: "0025", position: 2 },
  ],
  deck_code_id: "dc1",
  code: "aaaaaa-bbbbbb-cccccc",
  ace_spec_card_id: "",
  ace_spec_card_name: "",
  ace_spec_image_url: "",
  like_count: 0,
  liked_by_me: false,
  import_count: 0,
  recent_likers: [],
};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () => new Response("[]", { headers: { "content-type": "application/json" } }),
    ),
  );
});

// vitest の globals を切っているので、testing-library の自動 cleanup が効かない。
// 前のテストで開いたモーダル(portal)が残らないよう、ここで外す
afterEach(() => {
  cleanup();
});

describe("DeckCodePostCard", () => {
  // 「デッキ登録」で開くモーダルは createLazyModal 経由(押されてから読み込んでマウント)。
  // 初期値の反映が isOpen の変化頼みだと、この経路でだけアイコンが空のまま出る
  it("「デッキ登録」で開いたモーダルに、投稿のスプライトが初回から入る", async () => {
    render(<DeckCodePostCard post={POST} viewerId="u2" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "自分のデッキとして登録する" }));
    });

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      const alts = Array.from(dialog.querySelectorAll("img")).map((img) => img.getAttribute("alt"));
      expect(alts).toContain("6");
      expect(alts).toContain("25");
    });
  });

  it("未ログインで「類似デッキ」を押すと、シートを開かずにログインを促す", async () => {
    const onRequireLogin = vi.fn();
    render(<DeckCodePostCard post={POST} viewerId={null} onRequireLogin={onRequireLogin} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "類似している入賞デッキを見る" }));
    });

    expect(onRequireLogin).toHaveBeenCalledWith("類似デッキを見るにはログインが必要です");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // 公開デッキは他人のデッキなので、検索元を「あなたのデッキ」と呼ばない
  it("「類似デッキ」で投稿のデッキコードを引き、検索元を「このデッキ」と呼ぶ", async () => {
    const body = {
      source: {
        deckCode: POST.code,
        origin: "external",
        environmentId: "env1",
        environmentTitle: "テスト環境",
        archetype: { archetypeId: "a1", label: "リザードンex", sprites: ["0006"] },
        archetypeSkipped: false,
        placements: 0,
        unresolved: [],
      },
      similar: [
        {
          entryId: "e1",
          deckCode: "xxxxxx-yyyyyy-zzzzzz",
          similarity: 0.9,
          eventDate: "2026-09-20T00:00:00+09:00",
          prefectureName: "東京都",
          leagueName: "オープン",
          rank: 1,
          diffIn: ["ふしぎなアメ"],
          diffOut: ["ネストボール"],
          archetype: { archetypeId: "a1", label: "リザードンex", sprites: ["0006"] },
          sameArchetype: true,
          sameCode: false,
        },
      ],
      candidates: 10,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = url.includes("/similar") ? body : [];
      return new Response(JSON.stringify(json), { headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DeckCodePostCard post={POST} viewerId="u2" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "類似している入賞デッキを見る" }));
    });

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.textContent).toContain("このデッキにだけある"));
    expect(dialog.textContent).not.toContain("あなたのデッキ");
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain(
      `/api/deckcards/${POST.code}/similar`,
    );
  });
});
