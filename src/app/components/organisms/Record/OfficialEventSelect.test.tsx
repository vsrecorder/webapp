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
  league_id: 1411,
  league_title: "その他",
};

const CITY: RecordCreateOfficialEventType = {
  ...GYM,
  id: 34,
  title: "【〇〇店】ポケモンカードゲーム　シティリーグ",
  type_id: 2,
};

// ジャッジの稼働。公式サイトでは大型大会として載るが、対戦の記録を付ける対象ではない
const JUDGE: RecordCreateOfficialEventType = {
  ...GYM,
  id: 56,
  title: "チャンピオンズリーグ2027千葉　ジャッジ稼働",
  type_id: 1,
};

// オーガナイザーイベントの「ジャッジとバトル！」は実際に対戦するので候補に残す
const ORGANIZER_JUDGE: RecordCreateOfficialEventType = {
  ...GYM,
  id: 78,
  title: "ジャッジとバトル！",
  type_id: 6,
};

// CL のシニアの「どちらの日でも可」の応募枠。実際に対戦するのは 1日目か 2日目の大会
const SENIOR_EITHER_DAY: RecordCreateOfficialEventType = {
  ...GYM,
  id: 90,
  title: "チャンピオンズリーグ2027 横浜 シニアリーグ 1日目大会or2日目大会どちらでも可",
  type_id: 1,
  league_title: "シニア",
};

const SENIOR_DAY1: RecordCreateOfficialEventType = {
  ...SENIOR_EITHER_DAY,
  id: 91,
  title: "チャンピオンズリーグ2027 横浜 シニアリーグ 1日目大会",
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

    // 候補は種別順(シティリーグ type_id: 2 → ジムバトル type_id: 4)に並ぶので、先頭はシティリーグ
    expect(selectedTitle()).toBe("シティリーグ");
  });

  it("指が動いた(リスト送り)ときは選ばれない", async () => {
    render(<Harness />);

    const options = await openMenu();

    fireTouch(options[0], "touchStart", [{ clientX: 40, clientY: 200 }]);
    fireTouch(options[0], "touchEnd", [{ clientX: 40, clientY: 120 }]);

    expect(selectedTitle()).toBe("");
  });

  /*
   * react-select は、開いている欄をもう一度タップして閉じたときや Esc で閉じたときに
   * 検索欄へフォーカスを残すので、そのままではソフトウェアキーボードが出たままになる。
   */
  it("選ばずに Esc でメニューを閉じても、検索欄からフォーカスが外れる", async () => {
    render(<Harness />);

    const combobox = screen.getByRole("combobox");
    combobox.focus();

    await openMenu();
    fireEvent.keyDown(combobox, { key: "Escape" });

    expect(document.activeElement).not.toBe(combobox);
  });

  it("開いている欄をもう一度押して閉じても、検索欄からフォーカスが外れる", async () => {
    const { container } = render(<Harness />);

    const combobox = screen.getByRole("combobox");
    combobox.focus();

    await openMenu();

    // 検索欄(INPUT)そのものを押しても閉じないので、欄の枠を押す
    const control = container.querySelector('[class$="-control"]');
    expect(control).not.toBeNull();
    fireEvent.mouseDown(control as Element);

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(document.activeElement).not.toBe(combobox);
  });

  it("候補は API の順(開催時刻順)ではなく、種別 → 区分(オープン → マスター → シニア → ジュニア)の順に並ぶ", async () => {
    const TRAINERS_MASTER: RecordCreateOfficialEventType = {
      ...GYM,
      id: 91,
      title: "【26/11】ポケモンカードジム　トレーナーズリーグ（マスターリーグ）",
      type_id: 3,
      league_id: 1417,
      league_title: "マスター",
    };
    const TRAINERS_OPEN: RecordCreateOfficialEventType = {
      ...TRAINERS_MASTER,
      id: 92,
      title: "【26/11】ポケモンカードジム　トレーナーズリーグ（オープンリーグ）",
      league_id: 1410,
      league_title: "オープン",
    };
    // league_id はジュニア(1413)・シニア(1414)がマスター(1417)より小さい。区分の順で並ぶことを見る
    const TRAINERS_JUNIOR: RecordCreateOfficialEventType = {
      ...TRAINERS_MASTER,
      id: 93,
      title: "【26/11】ポケモンカードジム　トレーナーズリーグ（ジュニアリーグ）",
      league_id: 1413,
      league_title: "ジュニア",
    };
    const TRAINERS_SENIOR: RecordCreateOfficialEventType = {
      ...TRAINERS_MASTER,
      id: 94,
      title: "【26/11】ポケモンカードジム　トレーナーズリーグ（シニアリーグ）",
      league_id: 1414,
      league_title: "シニア",
    };
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({
        count: 6,
        official_events: [GYM, TRAINERS_JUNIOR, TRAINERS_MASTER, TRAINERS_SENIOR, TRAINERS_OPEN, CITY],
      }),
    );

    render(<Harness />);
    const options = await openMenu();

    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("シティリーグ"),
      expect.stringContaining("オープン"),
      expect.stringContaining("マスター"),
      expect.stringContaining("シニア"),
      expect.stringContaining("ジュニア"),
      expect.stringContaining("ジムバトル"),
    ]);
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
  describe("ジャッジの募集・稼働", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({ count: 3, official_events: [GYM, JUDGE, ORGANIZER_JUDGE] }),
        ),
      );
    });

    it("大型大会のジャッジ稼働は候補に出さず、オーガナイザーイベントは出す", async () => {
      render(<Harness />);

      const options = await openMenu();

      expect(options).toHaveLength(2);
      expect(screen.queryByText(JUDGE.title)).toBeNull();
      // ScrollingText は流すために同じ文字列を複数描くので、件数ではなく有無を見る
      expect(screen.queryAllByText(ORGANIZER_JUDGE.title).length).toBeGreaterThan(0);
    });

    it("URL で指定されても選ばない", async () => {
      render(<Harness presetId={JUDGE.id} />);

      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(selectedTitle()).toBe("");
    });

    it("既に選ばれている(作成済みの記録を編集する)ときはプレビューに出す", async () => {
      render(<Harness initialSelected={toOfficialEventOption(JUDGE)} />);

      // 親の表示(selected)とは別に、プレビューカードにも出る。
      // タイトルの全角スペースが既定の正規化で潰れないよう、正規化を切って照合する
      await waitFor(() =>
        expect(
          screen.queryAllByText(JUDGE.title, { normalizer: (text) => text }).length,
        ).toBeGreaterThan(1),
      );
    });
  });

  describe("CL の「どちらの日でも可」の応募枠", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({ count: 2, official_events: [SENIOR_DAY1, SENIOR_EITHER_DAY] }),
        ),
      );
    });

    it("候補に出さず、1日目大会は出す", async () => {
      render(<Harness />);

      const options = await openMenu();

      expect(options).toHaveLength(1);
      expect(screen.queryAllByText(/どちらでも可/)).toHaveLength(0);
      expect(screen.queryAllByText(/シニアリーグ 1日目大会$/).length).toBeGreaterThan(0);
    });

    it("既に選ばれている(作成済みの記録を編集する)ときはプレビューに出す", async () => {
      render(<Harness initialSelected={toOfficialEventOption(SENIOR_EITHER_DAY)} />);

      await waitFor(() => expect(screen.queryAllByText(/どちらでも可/).length).toBeGreaterThan(0));
    });
  });
});
