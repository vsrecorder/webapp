// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import OpponentDecks from "@app/components/templates/OpponentDecks";

// 完了・失敗の通知(addToast)だけを差し替える。他の HeroUI の部品は本物を使う
const addToast = vi.hoisted(() => vi.fn());
vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@heroui/react")>()),
  addToast,
}));

/*
 * 相手デッキの一括編集の流れ: 一覧 → 組み合わせを選ぶ → 変更後を入力 → 確認 → 置き換え。
 * 置き換えの指定(from / to)が一覧の組み合わせと入力どおりに送られることを確かめる
 */

// jsdom は ResizeObserver を持たない。並び順のタブと候補行の HScrollRow が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const decksBody = {
  data: [
    {
      opponents_deck_info: "ドラパルトex",
      pokemon_sprites: [
        { id: "0887", position: 1 },
        { id: "0006", position: 2 },
      ],
      count: 12,
      last_event_date: "2026-09-28",
    },
    {
      opponents_deck_info: "ドラパ",
      pokemon_sprites: [],
      count: 3,
      last_event_date: "2026-08-01",
    },
  ],
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

// 一覧と編集を切り替えるたびに先頭へ送る
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

afterEach(() => {
  cleanup();
  // 編集中は URL に ?edit= が付く。次のテストへ持ち越さない
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

const renderPage = () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    init?.method === "PUT" ? json({ updated_count: 3 }) : json(decksBody),
  );
  vi.stubGlobal("fetch", fetchMock);

  render(
    // テストごとに SWR のキャッシュを分ける
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <OpponentDecks />
    </SWRConfig>,
  );

  return { fetchMock };
};

const waitForList = () =>
  waitFor(() => expect(screen.getByText("ドラパ")).toBeTruthy(), { timeout: 3000 });

describe("OpponentDecks(相手デッキの一括編集)", () => {
  it("自分の相手デッキを件数と最終対戦日つきで並べ、検索で絞れる", async () => {
    renderPage();
    await waitForList();

    expect(screen.getByText("12戦")).toBeTruthy();
    expect(screen.getByText("最終 2026/9/28")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("相手デッキを検索"), {
      target: { value: "どらぱると" },
    });

    await waitFor(() => expect(screen.queryByText("ドラパ")).toBeNull());
    expect(screen.getByText("ドラパルトex")).toBeTruthy();
  });

  it("既にある組み合わせに揃えると、確認のあと from と to を送って一覧を取り直す", async () => {
    const { fetchMock } = renderPage();
    await waitForList();

    fireEvent.click(screen.getByText("ドラパ"));

    // 変更前と同じままでは押せない
    const submit = await screen.findByRole("button", { name: "3戦をまとめて変更" });
    expect(
      submit.hasAttribute("disabled") || submit.getAttribute("data-disabled") === "true",
    ).toBe(true);

    // 「作成済みの相手のデッキに揃える」から既存の組み合わせを選ぶ
    const suggestionLabel = screen.getByText("作成済みの相手のデッキに揃える");
    const suggestionRow = suggestionLabel.nextElementSibling as HTMLElement;
    fireEvent.click(within(suggestionRow).getByText("ドラパルトex"));

    fireEvent.click(screen.getByRole("button", { name: "3戦をまとめて変更" }));

    // 既存の組み合わせとまとめて数えられることを確認画面で伝える
    expect(
      await screen.findByText(/「ドラパルトex」の12戦とまとめて数えられる/),
    ).toBeTruthy();
    // 変更前 → 変更後を並べ、まとめた後の対戦数も出す
    expect(screen.getByText("12戦 → 15戦")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "変更する" }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true),
    );

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(put?.[0]).toBe("/api/matches/opponent_decks");
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      from: { opponents_deck_info: "ドラパ", pokemon_sprites: [] },
      to: {
        opponents_deck_info: "ドラパルトex",
        pokemon_sprites: [
          { id: "0887", position: 1 },
          { id: "0006", position: 2 },
        ],
      },
    });

    // 置き換えたあとは一覧に戻り、取り直す(初回 + 置き換え後)
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) =>
            !init?.method && String(input) === "/api/matches/opponent_decks",
        ),
      ).toHaveLength(2),
    );
    expect(await screen.findByLabelText("相手デッキを検索")).toBeTruthy();
    expect(window.location.search).toBe("");
  });

  it("表記を空にしては置き換えられない", async () => {
    renderPage();
    await waitForList();

    fireEvent.click(screen.getByText("ドラパ"));
    fireEvent.change(await screen.findByLabelText("変更後の相手デッキ"), {
      target: { value: "  " },
    });

    const submit = screen.getByRole("button", { name: "3戦をまとめて変更" });
    expect(
      submit.hasAttribute("disabled") || submit.getAttribute("data-disabled") === "true",
    ).toBe(true);
    // 押せない理由を入力欄で伝える
    expect(screen.getByText("相手デッキの表記を入力してください")).toBeTruthy();
  });

  // 一覧を開いたあとに別の画面で直していると 0 件になる。成功とは言わず、一覧を取り直す
  it("置き換えた対戦が 0 件なら、成功ではなく見つからなかったと伝える", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === "PUT" ? json({ updated_count: 0 }) : json(decksBody),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <OpponentDecks />
      </SWRConfig>,
    );
    await waitForList();

    fireEvent.click(screen.getByText("ドラパ"));
    fireEvent.change(await screen.findByLabelText("変更後の相手デッキ"), {
      target: { value: "ドラパルト" },
    });
    fireEvent.click(screen.getByRole("button", { name: "3戦をまとめて変更" }));
    fireEvent.click(await screen.findByRole("button", { name: "変更する" }));

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "変更する対戦が見つかりませんでした" }),
      ),
    );
  });

  describe("ブラウザの履歴", () => {
    it("編集画面でブラウザの「戻る」を押すと、ページを離れず一覧に戻る", async () => {
      renderPage();
      await waitForList();

      fireEvent.click(screen.getByText("ドラパ"));
      expect(await screen.findByLabelText("変更後の相手デッキ")).toBeTruthy();
      expect(new URLSearchParams(window.location.search).get("edit")).toBe("ドラパ||");

      window.history.back();

      expect(await screen.findByLabelText("相手デッキを検索")).toBeTruthy();
      expect(screen.queryByLabelText("変更後の相手デッキ")).toBeNull();
      expect(window.location.search).toBe("");
    });

    it("「一覧に戻る」も履歴を戻して一覧に戻る", async () => {
      renderPage();
      await waitForList();

      fireEvent.click(screen.getByText("ドラパ"));
      fireEvent.click(await screen.findByText("一覧に戻る"));

      expect(await screen.findByLabelText("相手デッキを検索")).toBeTruthy();
      expect(window.location.search).toBe("");
    });

    it("?edit= 付きの URL を開くと、その組み合わせの編集画面から始まる", async () => {
      window.history.replaceState(null, "", `/?edit=${encodeURIComponent("ドラパ||")}`);
      renderPage();

      const input = (await screen.findByLabelText("変更後の相手デッキ", undefined, {
        timeout: 3000,
      })) as HTMLInputElement;
      expect(input.value).toBe("ドラパ");

      // 積んだ履歴が無いので、「一覧に戻る」は URL を書き換えて一覧を出す
      fireEvent.click(screen.getByText("一覧に戻る"));
      expect(await screen.findByLabelText("相手デッキを検索")).toBeTruthy();
      expect(window.location.search).toBe("");
    });

    it("一覧に無い組み合わせの ?edit= は、一覧を出して URL から外す", async () => {
      window.history.replaceState(null, "", "/?edit=" + encodeURIComponent("無い表記||"));
      renderPage();
      await waitForList();

      await waitFor(() => expect(window.location.search).toBe(""));
      expect(screen.queryByLabelText("変更後の相手デッキ")).toBeNull();
    });
  });
});
