// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import EditEventInfoModal from "@app/components/organisms/Record/Modal/EditEventInfoModal";

import { RecordGetByIdResponseType } from "@app/types/record";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, status: "authenticated" }),
}));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));

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
});

const json = { "content-type": "application/json" };
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: json });
const fail = (status = 500) => ok({ message: "internal server error" }, status);

const RECORD_ID = "01KZNTTDTF88D814T7GQHGYNR1";
const OLD_EVENT_ID = "01KZNTTDTF88D814T7GQHGYNE1";
const NEW_EVENT_ID = "01KZNTTDTF88D814T7GQHGYNE2";

const baseRecord = {
  id: RECORD_ID,
  created_at: "2026-11-20T10:00:00+09:00",
  official_event_id: 0,
  tonamel_event_id: "",
  friend_id: "",
  unofficial_event_id: "",
  user_id: "u1",
  deck_id: "",
  deck_code_id: "",
  event_date: "2026-11-20T00:00:00+09:00",
  private_flg: true,
  ignore_stats_flg: false,
  regulation_id: 1,
  tcg_meister_url: "",
  memo: "",
  tags: [],
} as unknown as RecordGetByIdResponseType;

// 自由形式イベントに紐づく記録
const unofficialRecord = { ...baseRecord, unofficial_event_id: OLD_EVENT_ID };
// 公式イベントに紐づく記録
const officialRecord = { ...baseRecord, official_event_id: 1190477 };

type Call = { method: string; url: string; body: unknown };

/*
 * 画面が投げる要求を記録しながら、要求ごとに応答を決める。
 * respond が undefined を返した要求(公式イベントの候補・Tonamel の確認など)は空で返す。
 */
function stubFetch(respond: (call: Call, calls: Call[]) => Response | undefined) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const call: Call = {
        method: init?.method ?? "GET",
        url: String(url),
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);

      return respond(call, calls) ?? new Response("[]", { headers: json });
    }),
  );

  return {
    calls,
    count: (method: string, url: string) =>
      calls.filter((c) => c.method === method && c.url === url).length,
    last: (method: string, url: string) =>
      calls.filter((c) => c.method === method && c.url === url).at(-1),
  };
}

const EVENTS = "/api/unofficial_events";
const RECORD = `/api/records/${RECORD_ID}`;

const renderModal = (props: {
  record: RecordGetByIdResponseType;
  onOpenChange: () => void;
  setRecord?: () => void;
  onUpdated?: () => void;
}) =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <EditEventInfoModal
        record={props.record}
        setRecord={props.setRecord ?? (() => {})}
        isOpen
        onOpenChange={props.onOpenChange}
        onUpdated={props.onUpdated}
      />
    </SWRConfig>,
  );

const titleInput = () => screen.getByLabelText(/イベント名/) as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: "変更" });
const isDisabled = (el: HTMLElement) =>
  el.hasAttribute("disabled") || el.getAttribute("data-disabled") === "true";
const selectTab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

/*
 * 記録のイベント情報の変更に失敗しても、入力を消さない。
 * 以前は失敗時にもモーダルを閉じていて、開き直すと入力が記録の内容へ戻っていた。
 */
describe("EditEventInfoModal", () => {
  describe("自由形式イベントの名前を変える", () => {
    const eventResponse = (title: string) => ({
      id: OLD_EVENT_ID,
      user_id: "u1",
      title,
      date: "2026-11-20T00:00:00+09:00",
    });

    it("イベントの更新に失敗しても閉じず、入力した名前が残り、そのままやり直せる", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { count } = stubFetch((call, calls) => {
        if (call.url === `${EVENTS}/${OLD_EVENT_ID}` && call.method === "GET") {
          return ok(eventResponse("元の名前"));
        }
        if (call.url === `${EVENTS}/${OLD_EVENT_ID}` && call.method === "PUT") {
          // 1回目だけ失敗させる
          const puts = calls.filter((c) => c.method === "PUT" && c.url === call.url).length;
          return puts === 1 ? fail() : ok(eventResponse("変更後の名前"));
        }
        if (call.url === RECORD && call.method === "PUT") return ok(unofficialRecord);
      });
      const onOpenChange = vi.fn();
      const setRecord = vi.fn();
      renderModal({ record: unofficialRecord, onOpenChange, setRecord });

      await waitFor(() => expect(titleInput().value).toBe("元の名前"));
      fireEvent.change(titleInput(), { target: { value: "変更後の名前" } });
      fireEvent.click(submitButton());

      await waitFor(() => expect(count("PUT", `${EVENTS}/${OLD_EVENT_ID}`)).toBe(1));
      // 送信中は押せない。失敗の後始末が済むと、また押せる
      await waitFor(() => expect(isDisabled(submitButton())).toBe(false));

      expect(titleInput().value).toBe("変更後の名前");
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(setRecord).not.toHaveBeenCalled();
      // イベントの更新で止まったので、記録は更新していない
      expect(count("PUT", RECORD)).toBe(0);

      fireEvent.click(submitButton());

      await waitFor(() => expect(setRecord).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
      expect(count("PUT", `${EVENTS}/${OLD_EVENT_ID}`)).toBe(2);
      expect(count("PUT", RECORD)).toBe(1);
    });
  });

  describe("公式イベントから自由形式へ変える", () => {
    const created = { id: NEW_EVENT_ID, user_id: "u1", title: "自主大会", date: "2026-11-20T00:00:00Z" };

    const fillUnofficial = async (title: string) => {
      // 公式イベントの記録なので、最初は公式イベントのタブが出ている
      await screen.findByRole("tab", { name: "自由形式" });
      selectTab("自由形式");
      fireEvent.change(await screen.findByLabelText(/イベント名/), { target: { value: title } });
    };

    /*
     * 自由形式イベントを作ったあと、記録の更新で失敗する場合。
     * やり直すたびに作り直すと、どの記録からも参照されないイベントが増えていく。
     */
    it("記録の更新に失敗しても閉じず、やり直しではイベントを作り直さずに使い回す", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { count, last } = stubFetch((call, calls) => {
        if (call.url === EVENTS && call.method === "POST") return ok(created, 201);
        if (call.url === `${EVENTS}/${NEW_EVENT_ID}` && call.method === "PUT") {
          return ok({ ...created, title: (call.body as { title: string }).title });
        }
        if (call.url === RECORD && call.method === "PUT") {
          // 1回目だけ失敗させる
          const puts = calls.filter((c) => c.method === "PUT" && c.url === RECORD).length;
          return puts === 1
            ? fail()
            : ok({ ...officialRecord, official_event_id: 0, unofficial_event_id: NEW_EVENT_ID });
        }
      });
      const onOpenChange = vi.fn();
      const setRecord = vi.fn();
      renderModal({ record: officialRecord, onOpenChange, setRecord });

      await fillUnofficial("自主大会");
      fireEvent.click(submitButton());

      await waitFor(() => expect(count("PUT", RECORD)).toBe(1));
      await waitFor(() => expect(isDisabled(submitButton())).toBe(false));

      expect(titleInput().value).toBe("自主大会");
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(setRecord).not.toHaveBeenCalled();
      expect(count("POST", EVENTS)).toBe(1);

      // 名前を直してからやり直す
      fireEvent.change(titleInput(), { target: { value: "自主大会(秋)" } });
      fireEvent.click(submitButton());

      await waitFor(() => expect(setRecord).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());

      // 作り直していない。前回作ったイベントを、直した名前で更新している
      expect(count("POST", EVENTS)).toBe(1);
      expect(count("PUT", `${EVENTS}/${NEW_EVENT_ID}`)).toBe(1);
      expect((last("PUT", `${EVENTS}/${NEW_EVENT_ID}`)?.body as { title: string }).title).toBe(
        "自主大会(秋)",
      );
      // 記録には、その使い回したイベントを紐づけている
      expect(
        (last("PUT", RECORD)?.body as { unofficial_event_id: string }).unofficial_event_id,
      ).toBe(NEW_EVENT_ID);
      // 使ったイベントは消さない
      expect(count("DELETE", `${EVENTS}/${NEW_EVENT_ID}`)).toBe(0);
    });

    // やり直しで種別を変えた場合、前回作ったイベントは使われない。残すとどの記録からも
    // 参照されないままになるので、記録の更新が通ったあとに消す
    it("失敗のあと別の種別でやり直したら、使わなかったイベントを消す", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { count, last } = stubFetch((call, calls) => {
        if (call.url === EVENTS && call.method === "POST") return ok(created, 201);
        if (call.url === "/api/tonamel_events/YFUVY") {
          return ok({ id: "YFUVY", title: "テスト大会", image: "" });
        }
        if (call.url === `${EVENTS}/${NEW_EVENT_ID}` && call.method === "DELETE") {
          return new Response(null, { status: 204 });
        }
        if (call.url === RECORD && call.method === "PUT") {
          const puts = calls.filter((c) => c.method === "PUT" && c.url === RECORD).length;
          return puts === 1
            ? fail()
            : ok({ ...officialRecord, official_event_id: 0, tonamel_event_id: "YFUVY" });
        }
      });
      const onOpenChange = vi.fn();
      renderModal({ record: officialRecord, onOpenChange });

      await fillUnofficial("自主大会");
      fireEvent.click(submitButton());
      await waitFor(() => expect(count("PUT", RECORD)).toBe(1));
      await waitFor(() => expect(isDisabled(submitButton())).toBe(false));
      expect(count("POST", EVENTS)).toBe(1);

      // Tonamel に切り替えてやり直す(IDの実在を確認できると変更できる)
      selectTab("Tonamel");
      fireEvent.change(await screen.findByPlaceholderText("例) YFUVY"), {
        target: { value: "YFUVY" },
      });
      await waitFor(() => expect(isDisabled(submitButton())).toBe(false), { timeout: 3000 });
      fireEvent.click(submitButton());

      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());

      const body = last("PUT", RECORD)?.body as { tonamel_event_id: string; unofficial_event_id: string };
      expect(body.tonamel_event_id).toBe("YFUVY");
      expect(body.unofficial_event_id).toBe("");
      expect(count("DELETE", `${EVENTS}/${NEW_EVENT_ID}`)).toBe(1);
    });

    it("成功したら反映して閉じる(イベントは1回だけ作る)", async () => {
      const { count } = stubFetch((call) => {
        if (call.url === EVENTS && call.method === "POST") return ok(created, 201);
        if (call.url === RECORD && call.method === "PUT") {
          return ok({ ...officialRecord, official_event_id: 0, unofficial_event_id: NEW_EVENT_ID });
        }
      });
      const onOpenChange = vi.fn();
      const setRecord = vi.fn();
      renderModal({ record: officialRecord, onOpenChange, setRecord });

      await fillUnofficial("自主大会");
      fireEvent.click(submitButton());

      await waitFor(() => expect(setRecord).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
      expect(count("POST", EVENTS)).toBe(1);
      expect(count("PUT", RECORD)).toBe(1);
    });

    // 保存は済んでいるので、開いたままにすると「失敗したのに反映されている」ように見える
    it("記録の更新が済んだあとの後処理で失敗した場合は閉じる", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { count } = stubFetch((call) => {
        if (call.url === EVENTS && call.method === "POST") return ok(created, 201);
        if (call.url === RECORD && call.method === "PUT") {
          return ok({ ...officialRecord, official_event_id: 0, unofficial_event_id: NEW_EVENT_ID });
        }
      });
      const onOpenChange = vi.fn();
      const onUpdated = vi.fn(() => {
        throw new Error("後処理の失敗");
      });
      renderModal({ record: officialRecord, onOpenChange, onUpdated });

      await fillUnofficial("自主大会");
      fireEvent.click(submitButton());

      await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
      expect(count("PUT", RECORD)).toBe(1);
    });
  });
});
