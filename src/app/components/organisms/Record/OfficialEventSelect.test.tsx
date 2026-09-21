// @vitest-environment jsdom
import { useState } from "react";

import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OfficialEventSelect from "@app/components/organisms/Record/OfficialEventSelect";
import {
  OfficialEventOption,
  toOfficialEventOption,
} from "@app/components/organisms/Record/officialEventOption";
import { RecordCreateOfficialEventType } from "@app/types/official_event";

// jsdom は ResizeObserver を持たない。イベント名を流す ScrollingText が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const DATE = "2026-09-21";

const GYM: RecordCreateOfficialEventType = {
  id: 12,
  title: "【ポケモンカードジム】ポケモンカードゲーム　ジムバトル",
  address: "東京都町田市原町田1-1-1",
  venue: "",
  date: new Date("2026-09-21T00:00:00Z"),
  started_at: new Date("2026-09-21T04:00:00Z"),
  ended_at: new Date("2026-09-21T07:00:00Z"),
  type_id: 4,
  shop_name: "カードショップ町田店",
};

const CITY: RecordCreateOfficialEventType = {
  ...GYM,
  id: 34,
  title: "【〇〇店】ポケモンカードゲーム　シティリーグ",
  type_id: 2,
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ count: 2, official_events: [GYM, CITY] })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// 選択結果は親が持つ。どのイベントが選ばれたかをそのまま読めるよう表示する
function Harness({
  initialSelected = null,
  ...props
}: {
  enabled?: boolean;
  presetId?: number;
  initialEvents?: RecordCreateOfficialEventType[];
  initialEventsDate?: string;
  initialSelected?: OfficialEventOption | null;
}) {
  const [selected, setSelected] = useState<OfficialEventOption | null>(initialSelected);

  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <div data-testid="selected">{selected ? selected.title : ""}</div>
      <OfficialEventSelect
        date={DATE}
        selectedId={selected?.id ?? null}
        onChange={setSelected}
        {...props}
      />
    </SWRConfig>
  );
}

const selectedTitle = () => screen.getByTestId("selected").textContent;

describe("OfficialEventSelect", () => {
  it("URL で指定されたイベントは候補が届いた時点で選ばれる", async () => {
    render(<Harness presetId={GYM.id} />);

    await waitFor(() => expect(selectedTitle()).toBe("ジムバトル"));
  });

  it("候補に無いイベントを指定されても選ばない", async () => {
    render(<Harness presetId={999} />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(selectedTitle()).toBe("");
  });

  it("enabled が false の間は取りに行かない", async () => {
    render(<Harness enabled={false} presetId={GYM.id} />);

    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    expect(selectedTitle()).toBe("");
  });

  it("開催日が一致する先読みぶんは、取りに行かずにそのまま使う", async () => {
    render(
      <Harness presetId={GYM.id} initialEvents={[GYM]} initialEventsDate={DATE} />,
    );

    await waitFor(() => expect(selectedTitle()).toBe("ジムバトル"));
    expect(fetch).not.toHaveBeenCalled();
  });

  /*
   * jsdom は TouchList を作れないので、触れる形だけ揃えたものを差し込む。
   * react-select も document に張った touchstart で touches.item(0) を呼ぶため、
   * item を持たせないとライブラリ側が落ちる。
   */
  type Point = { clientX: number; clientY: number };

  function touchList(points: Point[]) {
    return Object.assign([...points], {
      item: (index: number) => points[index] ?? null,
      length: points.length,
    });
  }

  // fireEvent に touches を渡しても jsdom の TouchEvent には載らないため、作ってから差し込む
  function fireTouch(
    element: Element,
    type: "touchStart" | "touchEnd",
    points: Point[],
  ) {
    const event = createEvent[type](element, {});
    const moving = type === "touchStart" ? points : [];

    Object.defineProperty(event, "touches", { value: touchList(moving) });
    Object.defineProperty(event, "changedTouches", { value: touchList(points) });

    fireEvent(element, event);
  }

  // メニューを開いて候補を出す。react-select は下矢印でも開く
  async function openMenu() {
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    return await screen.findAllByRole("option");
  }

  /*
   * iOS は「タップ → 検索欄の blur → キーボードが閉じてレイアウトが動く → click」の順で
   * イベントを出すため、click を待つと1回目のタップが落ちる。touchend で確定させている。
   */
  it("指を動かさずに離したら、その候補が選ばれる", async () => {
    render(<Harness />);

    const options = await openMenu();

    fireTouch(options[0], "touchStart", [{ clientX: 40, clientY: 120 }]);
    fireTouch(options[0], "touchEnd", [{ clientX: 41, clientY: 122 }]);

    expect(selectedTitle()).toBe("ジムバトル");
  });

  it("指が動いた(リスト送り)ときは選ばれない", async () => {
    render(<Harness />);

    const options = await openMenu();

    fireTouch(options[0], "touchStart", [{ clientX: 40, clientY: 200 }]);
    fireTouch(options[0], "touchEnd", [{ clientX: 40, clientY: 120 }]);

    expect(selectedTitle()).toBe("");
  });

  it("既にイベントが選ばれているときは URL 指定で上書きしない", async () => {
    // タブを行き来すると選択欄ごと作り直される。そのとき指定が生きていると
    // 利用者の選び直しを上書きしてしまうため、選択済みなら適用しない
    render(
      <Harness presetId={GYM.id} initialSelected={toOfficialEventOption(CITY)} />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(selectedTitle()).toBe("シティリーグ");
  });

  it("開催日が違う先読みぶんは使わず、その日を取り直す", async () => {
    render(
      <Harness
        presetId={GYM.id}
        initialEvents={[GYM]}
        initialEventsDate="2026-09-20"
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      `/api/official_events?date=${DATE}`,
      expect.anything(),
    );
  });
});
