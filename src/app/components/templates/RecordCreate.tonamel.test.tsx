// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/records/create",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, status: "authenticated" }),
}));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));
// 記録を作ったあとのルーターのキャッシュ破棄(サーバーアクション)。ここでは呼ばれるだけでよい
vi.mock("@app/actions/routerCache", () => ({ refreshClientRouterCache: async () => {} }));

// jsdom は ResizeObserver / IntersectionObserver / matchMedia を持たない
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

const json = { "content-type": "application/json" };
const CHECK_DELAY_MS = 500;

/*
 * Tonamel の確認(/api/tonamel_events/{id})だけ指定の応答を返す。記録の作成(POST /api/records)は
 * 呼ばれた回数を数える。ほか(デッキ・レギュレーションなど)は空で返す。
 */
function stubFetch(tonamel: (id: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith("/api/tonamel_events/")) {
      return tonamel(decodeURIComponent(u.slice("/api/tonamel_events/".length)));
    }
    if (u === "/api/records" && init?.method === "POST") {
      return new Response(JSON.stringify({ id: "01KZNTTDTF88D814T7GQHGYNR1" }), {
        status: 201,
        headers: json,
      });
    }

    return new Response("[]", { headers: json });
  });
  vi.stubGlobal("fetch", fetchMock);

  return {
    tonamelCalls: () =>
      fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/tonamel_events/")).length,
    recordPosts: () =>
      fetchMock.mock.calls.filter(
        ([url, init]) => String(url) === "/api/records" && init?.method === "POST",
      ).length,
  };
}

const found = () =>
  new Response(JSON.stringify({ id: "YFUVY", title: "テスト大会", image: "" }), { headers: json });
const notFound = () => new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: json });
const badGateway = () =>
  new Response(JSON.stringify({ error: "bad gateway" }), { status: 502, headers: json });

const renderTonamelTab = () =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <TemplateRecordCreate
        deck_id=""
        deck_code_id=""
        tab="tonamel"
        initial_decks={[]}
      />
    </SWRConfig>,
  );

const idInput = () => screen.getByPlaceholderText("例）YFUVY") as HTMLInputElement;
const createButton = () => screen.getByRole("button", { name: "記録を作成" });
const isDisabled = (el: HTMLElement) =>
  el.hasAttribute("disabled") || el.getAttribute("data-disabled") === "true";

/*
 * 記録作成ページの Tonamel タブ。作成できるのは、イベントIDの実在を確認できたあとだけ。
 * 以前は「無効と分かっていない」あいだ作成ボタンを押せたので、IDを打ってすぐ押すと、
 * 確認が終わる前に実在しないイベントの記録を作れた。
 */
describe("RecordCreate の Tonamel タブ", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("未入力では作成できない", () => {
    stubFetch(found);
    renderTonamelTab();

    expect(isDisabled(createButton())).toBe(true);
  });

  it("IDを入れても、確認が終わるまでは作成できない(入力欄は赤くしない)", async () => {
    // 確認の応答を止めておく
    let release: (res: Response) => void = () => {};
    const { tonamelCalls } = stubFetch(() => new Promise<Response>((resolve) => (release = resolve)));
    renderTonamelTab();

    fireEvent.change(idInput(), { target: { value: "YFUVY" } });

    // 打った直後(問い合わせる前)
    expect(isDisabled(createButton())).toBe(true);
    expect(screen.queryByText("無効なイベントIDです")).toBeNull();

    // 問い合わせ中
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });
    await waitFor(() => expect(tonamelCalls()).toBe(1));
    expect(isDisabled(createButton())).toBe(true);
    expect(screen.queryByText("無効なイベントIDです")).toBeNull();

    // 実在すると分かったら作成できる
    await act(async () => {
      release(found());
    });
    await waitFor(() => expect(isDisabled(createButton())).toBe(false));
    expect(screen.getByText("テスト大会")).toBeTruthy();
  });

  it("実在しないIDでは作成できず、無効と示す", async () => {
    stubFetch(notFound);
    renderTonamelTab();

    fireEvent.change(idInput(), { target: { value: "zzzzz" } });
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await screen.findByText("無効なイベントIDです");
    expect(isDisabled(createButton())).toBe(true);
  });

  it("確認できなかったときは作成できず、無効とは言わない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(badGateway);
    renderTonamelTab();

    fireEvent.change(idInput(), { target: { value: "YFUVY" } });
    await act(async () => {
      vi.advanceTimersByTime(CHECK_DELAY_MS);
    });

    await screen.findByText("確認できませんでした。自動で確認し直します");
    expect(screen.queryByText("無効なイベントIDです")).toBeNull();
    expect(isDisabled(createButton())).toBe(true);
  });
});
