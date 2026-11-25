// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import TemplateQuickRecordCreate from "@app/components/templates/QuickRecordCreate";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/records/quick",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, status: "authenticated" }),
}));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));
// 記録を作ったあとのルーターのキャッシュ破棄(サーバーアクション)。ここでは呼ばれるだけでよい
vi.mock("@app/actions/routerCache", () => ({ refreshClientRouterCache: async () => {} }));

// 保存後の後処理のひとつ。失敗させるテストだけ差し替える
const refreshKizuna = vi.fn();
vi.mock("@app/utils/kizunaClient", () => ({ refreshKizuna: () => refreshKizuna() }));

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
  push.mockReset();
  refreshKizuna.mockReset();
});

const json = { "content-type": "application/json" };
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: json });
const fail = () => ok({ message: "internal server error" }, 500);

const EVENT_ID = "01KZNTTDTF88D814T7GQHGYNE1";
const RECORD_ID = "01KZNTTDTF88D814T7GQHGYNR1";

type Call = { method: string; url: string; body: Record<string, unknown> | undefined };

/*
 * 画面が投げる要求を記録しながら、保存の3段(自由形式イベント → 記録 → 対戦)の応答を決める。
 * failOnce に入れた段は、1回目だけ失敗させる。ほか(候補・デッキなど)は空で返す。
 */
function stubFetch(failOnce: ReadonlySet<"event" | "record" | "match"> = new Set()) {
  const calls: Call[] = [];
  const posts = (url: string) => calls.filter((c) => c.method === "POST" && c.url === url);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const call: Call = {
        method: init?.method ?? "GET",
        url: String(url),
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);

      if (call.method === "POST") {
        const first = posts(call.url).length === 1;

        if (call.url === "/api/unofficial_events") {
          return failOnce.has("event") && first ? fail() : ok({ id: EVENT_ID }, 201);
        }
        if (call.url === "/api/records") {
          return failOnce.has("record") && first
            ? fail()
            : ok({ id: RECORD_ID, deck_id: "", deck_code_id: "" }, 201);
        }
        if (call.url === "/api/matches") {
          return failOnce.has("match") && first ? fail() : ok({ id: "m1" }, 201);
        }
      }

      return new Response("[]", { headers: json });
    }),
  );

  return { posts };
}

const renderForm = () =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <TemplateQuickRecordCreate initialDecks={[]} />
    </SWRConfig>,
  );

const submitButton = () => screen.getByRole("button", { name: /この1戦を記録する/ });
const isDisabled = (el: HTMLElement) =>
  el.hasAttribute("disabled") || el.getAttribute("data-disabled") === "true";

// 必須の3項目(相手デッキ・先攻/後攻・勝ち/負け)を入れる。イベントは既定の自由形式・当日のまま
function fillRequired() {
  fireEvent.change(screen.getByLabelText("相手のデッキ"), { target: { value: "ドラパルトex" } });
  fireEvent.click(screen.getByRole("button", { name: "先攻" }));
  fireEvent.click(screen.getByRole("button", { name: "勝ち" }));
}

/*
 * 保存は 自由形式イベント → 記録 → 対戦 の順に、別々の要求で行う。途中で失敗したあとに
 * もう一度押すと、以前は最初からやり直していて、対戦の無い記録や、どの記録からも参照されない
 * 自由形式イベントがもう 1 件できていた。
 */
describe("QuickRecordCreate の保存のやり直し", () => {
  it("すべて通れば、3段を1回ずつ送って記録の画面へ進む", async () => {
    const { posts } = stubFetch();
    renderForm();
    fillRequired();

    fireEvent.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/records/${RECORD_ID}`));
    expect(posts("/api/unofficial_events")).toHaveLength(1);
    expect(posts("/api/records")).toHaveLength(1);
    expect(posts("/api/matches")).toHaveLength(1);
    expect(posts("/api/records")[0].body?.unofficial_event_id).toBe(EVENT_ID);
    expect(posts("/api/matches")[0].body?.record_id).toBe(RECORD_ID);
  });

  it("対戦の保存に失敗したあとのやり直しでは、記録を作り直さず対戦だけを送る", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { posts } = stubFetch(new Set(["match"]));
    renderForm();
    fillRequired();

    fireEvent.click(submitButton());
    await waitFor(() => expect(posts("/api/matches")).toHaveLength(1));
    await waitFor(() => expect(isDisabled(submitButton())).toBe(false));
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/records/${RECORD_ID}`));
    expect(posts("/api/unofficial_events")).toHaveLength(1);
    expect(posts("/api/records")).toHaveLength(1);
    expect(posts("/api/matches")).toHaveLength(2);
    expect(posts("/api/matches")[1].body?.record_id).toBe(RECORD_ID);
  });

  it("記録の保存に失敗したあとのやり直しでは、自由形式イベントを作り直さずに使い回す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { posts } = stubFetch(new Set(["record"]));
    renderForm();
    fillRequired();

    fireEvent.click(submitButton());
    await waitFor(() => expect(posts("/api/records")).toHaveLength(1));
    await waitFor(() => expect(isDisabled(submitButton())).toBe(false));

    fireEvent.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/records/${RECORD_ID}`));
    expect(posts("/api/unofficial_events")).toHaveLength(1);
    expect(posts("/api/records")).toHaveLength(2);
    expect(posts("/api/records")[1].body?.unofficial_event_id).toBe(EVENT_ID);
    expect(posts("/api/matches")).toHaveLength(1);
  });

  // 記録と対戦は保存できている。失敗と出すと、もう一度押されて同じ記録と対戦が二重にできる
  it("保存が済んだあとの後処理で例外が出ても、失敗とせず記録の画面へ進む", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    refreshKizuna.mockImplementation(() => {
      throw new Error("後処理の失敗");
    });
    const { posts } = stubFetch();
    renderForm();
    fillRequired();

    fireEvent.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/records/${RECORD_ID}`));
    expect(posts("/api/records")).toHaveLength(1);
    expect(posts("/api/matches")).toHaveLength(1);
  });
});
