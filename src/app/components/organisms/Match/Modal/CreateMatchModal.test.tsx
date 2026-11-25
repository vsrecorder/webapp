// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import CreateMatchModal from "@app/components/organisms/Match/Modal/CreateMatchModal";

import { RecordGetByIdResponseType } from "@app/types/record";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, status: "authenticated" }),
}));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));

// 完了・失敗の通知(addToast)だけを差し替える。他の HeroUI の部品は本物を使う
const addToast = vi.hoisted(() => vi.fn(() => "toast-1"));
vi.mock("@heroui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@heroui/react")>()),
  addToast,
  closeToast: vi.fn(),
}));

// 環境リターンの準備だけを差し替える(対象日の判定などは本物)
const fetchOpponentEnv = vi.hoisted(() => vi.fn());
vi.mock("@app/utils/deckEnv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@app/utils/deckEnv")>()),
  fetchOpponentEnv,
}));

// jsdom は ResizeObserver / IntersectionObserver を持たない
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  addToast.mockClear();
  fetchOpponentEnv.mockReset();
});

const json = { "content-type": "application/json" };

const RECORD_ID = "01KZNTTDTF88D814T7GQHGYNR1";
const MATCHES = "/api/matches";

// 今週の記録(環境リターンの対象になる)
const record = {
  id: RECORD_ID,
  created_at: new Date().toISOString(),
  official_event_id: 0,
  tonamel_event_id: "",
  friend_id: "",
  unofficial_event_id: "",
  user_id: "u1",
  deck_id: "",
  deck_code_id: "",
  event_date: new Date().toISOString(),
  private_flg: true,
  ignore_stats_flg: false,
  regulation_id: 1,
  tcg_meister_url: "",
  memo: "",
  tags: [],
} as unknown as RecordGetByIdResponseType;

const createdMatch = { id: "01KZNTTDTF88D814T7GQHGYNM1", record_id: RECORD_ID, games: [] };

/** 対戦の登録(POST /api/matches)への応答を決め、何回送られたかを数える */
function stubFetch(respondToCreate: () => Response) {
  let posts = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url) === MATCHES && init?.method === "POST") {
        posts += 1;
        return respondToCreate();
      }
      return new Response("[]", { headers: json });
    }),
  );

  return { posts: () => posts };
}

const renderModal = (props: { onClose: () => void; setMatches: () => void }) =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CreateMatchModal
        record={record}
        setMatches={props.setMatches}
        isOpen
        onOpenChange={props.onClose}
        onClose={props.onClose}
      />
    </SWRConfig>,
  );

const submitButton = () => screen.getByRole("button", { name: "作成" });
const isDisabled = (el: HTMLElement) =>
  el.hasAttribute("disabled") || el.getAttribute("data-disabled") === "true";

// いちばん少ない入力で作成できる形(不戦勝)にして、作成を押す
const submitDefaultVictory = async () => {
  fireEvent.click(await screen.findByRole("switch", { name: "不戦勝" }));
  await waitFor(() => expect(isDisabled(submitButton())).toBe(false));
  fireEvent.click(submitButton());
};

const toasts = () => addToast.mock.calls.map((c) => (c as unknown[])[0] as { title: string; description?: unknown });
const toastTitles = () => toasts().map((t) => t.title);

describe("CreateMatchModal", () => {
  /*
   * 保存が済んだあとの後処理が、登録と同じ try に入っていた。そこで例外が出ると「追加に失敗」と出て、
   * フォームは入力を残したまま開いている。もう一度押すと、同じ対戦が二重に入る。
   */
  it("保存のあと環境リターンの準備で例外が出ても、失敗とは出さず完了として閉じる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchOpponentEnv.mockRejectedValue(new TypeError("stat.decks is not iterable"));
    const { posts } = stubFetch(
      () => new Response(JSON.stringify(createdMatch), { status: 201, headers: json }),
    );
    const onClose = vi.fn();
    const setMatches = vi.fn();
    renderModal({ onClose, setMatches });

    await submitDefaultVictory();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(fetchOpponentEnv).toHaveBeenCalledTimes(1);
    expect(posts()).toBe(1);
    expect(setMatches).toHaveBeenCalledTimes(1);
    expect(toastTitles()).toContain("対戦結果の追加が完了");
    expect(toastTitles()).not.toContain("対戦結果の追加に失敗");
  });

  it("保存のあと応答を読めなくても、失敗とは出さず、一覧の取り直しを促して閉じる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { posts } = stubFetch(() => new Response("<html>", { status: 201 }));
    const onClose = vi.fn();
    const setMatches = vi.fn();
    renderModal({ onClose, setMatches });

    await submitDefaultVictory();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts()).toBe(1);
    // 応答を読めていないので、一覧には足せていない
    expect(setMatches).not.toHaveBeenCalled();
    expect(toastTitles()).not.toContain("対戦結果の追加に失敗");
    const done = toasts().find((t) => t.title === "対戦結果の追加が完了");
    expect(String(done?.description)).toContain("読み込み直してください");
  });

  it("保存そのものに失敗したら閉じず、失敗の理由を崩さずに出し、そのままやり直せる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let failing = true;
    const { posts } = stubFetch(() =>
      failing
        ? // BFF 自身の失敗(ログイン切れ)。本文は { error } で、message を持たない
          new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: json })
        : new Response(JSON.stringify(createdMatch), { status: 201, headers: json }),
    );
    fetchOpponentEnv.mockResolvedValue(null);
    const onClose = vi.fn();
    const setMatches = vi.fn();
    const { container } = renderModal({ onClose, setMatches });

    await submitDefaultVictory();

    await waitFor(() => expect(toastTitles()).toContain("対戦結果の追加に失敗"));
    await waitFor(() => expect(isDisabled(submitButton())).toBe(false));
    expect(onClose).not.toHaveBeenCalled();
    expect(setMatches).not.toHaveBeenCalled();

    // トーストの本文(JSX)を描いて、利用者に見える文言を確かめる
    const failed = toasts().find((t) => t.title === "対戦結果の追加に失敗");
    const { container: toastBody } = render(<>{failed?.description as React.ReactNode}</>, {
      container: container.ownerDocument.body.appendChild(document.createElement("div")),
    });
    expect(toastBody.textContent).toContain("ログインし直してください");
    expect(toastBody.textContent).toContain("HTTP error: 401 Message: unauthorized");
    expect(toastBody.textContent).not.toContain("undefined");

    failing = false;
    fireEvent.click(submitButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(posts()).toBe(2);
    expect(setMatches).toHaveBeenCalledTimes(1);
  });
});
