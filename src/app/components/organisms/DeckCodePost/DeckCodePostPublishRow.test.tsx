// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import DeckCodePostPublishRow from "@app/components/organisms/DeckCodePost/DeckCodePostPublishRow";

import { DeckCodePostType } from "@app/types/deck_code_post";

const POST: DeckCodePostType = {
  id: "post-1",
  published_at: "2026-09-01T00:00:00Z",
  unpublished_at: "0001-01-01T00:00:00Z",
  hidden: false,
  user: { id: "u1", name: "テスト", image_url: "", designation_tier: 0 },
  deck_id: "d1",
  deck_name: "リザードンex",
  pokemon_sprites: [],
  deck_code_id: "dc1",
  code: "aaaaaa-bbbbbb-cccccc",
  ace_spec_card_id: "",
  ace_spec_card_name: "",
  ace_spec_image_url: "",
  like_count: 2,
  liked_by_me: false,
  import_count: 0,
  recent_likers: [],
};

// SWR のキャッシュはグローバルなので、テストごとに空のものを与える
function renderRow() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <DeckCodePostPublishRow deckId="d1" deckCodeId="dc1" versionLabel="最新バージョン" />
    </SWRConfig>,
  );
}

// HeroUI の Switch は input[role=switch] の checked が状態を持つ
function switchInput() {
  return screen.getByRole("switch") as HTMLInputElement;
}

// 応答を保留できる fetch。読み込み中の見た目を確かめるのに使う
function stubFetch(posts: DeckCodePostType[]) {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await gate;

      return { ok: true, json: async () => posts } as Response;
    }),
  );

  return { release: () => release() };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeckCodePostPublishRow", () => {
  /*
   * 取得が終わるまでオフのスイッチを出すと、公開中のバージョンでも開いた直後だけ
   * 「載っていない」状態に見えてしまう。確定するまでスイッチを出さないことを確かめる。
   */
  it("公開状態を取得している間はスイッチを出さない", async () => {
    const { release } = stubFetch([POST]);
    renderRow();

    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText(/載っていません/)).toBeNull();

    release();

    await waitFor(() => expect(screen.getByRole("switch")).toBeTruthy());
  });

  /*
   * 骨格を中身と差し替えると、骨格の寸法を実物に合わせて書くことになり、
   * ズレるとその分だけ描画時に揺らぐ。寸法は常に実物が決める(骨格は上に重ねる)ので、
   * 読み込み中でもスイッチ本体と説明文の行はDOMに残っていなければならない。
   */
  it("読み込み中でも寸法を決める実物はDOMに残る", async () => {
    const { release } = stubFetch([POST]);
    const { container } = renderRow();

    // aria-hidden なので getByRole からは消えるが、要素自体は残る
    expect(container.querySelector('input[role="switch"]')).toBeTruthy();
    // 説明文の行も高さを保つため空白で残す
    expect(container.querySelector("span.truncate")?.textContent).toBe("\u00a0");

    release();

    await waitFor(() => expect(screen.getByRole("switch")).toBeTruthy());
  });

  it("公開中ならスイッチがオンで出る", async () => {
    const { release } = stubFetch([POST]);
    renderRow();
    release();

    await waitFor(() => expect(switchInput().checked).toBe(true));
    expect(screen.getByText(/公開中/)).toBeTruthy();
  });

  it("公開していなければスイッチがオフで出る", async () => {
    const { release } = stubFetch([]);
    renderRow();
    release();

    await waitFor(() => expect(screen.getByRole("switch")).toBeTruthy());
    expect(switchInput().checked).toBe(false);
    expect(screen.getByText(/載っていません/)).toBeTruthy();
  });

  it("アーカイブ済みなら取得を待たずにスイッチを出す(操作はできない)", async () => {
    stubFetch([]);
    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <DeckCodePostPublishRow deckId="d1" deckCodeId="dc1" isArchived />
      </SWRConfig>,
    );

    expect(switchInput().checked).toBe(false);
    expect(switchInput().disabled).toBe(true);
    expect(screen.getByText(/アーカイブしたデッキは公開できません/)).toBeTruthy();
  });
});
