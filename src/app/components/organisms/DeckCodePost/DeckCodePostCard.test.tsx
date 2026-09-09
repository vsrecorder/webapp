// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
