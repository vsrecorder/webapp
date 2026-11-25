import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRecentDeckArchetypes,
  pickRecentDeckArchetypes,
  resetRecentDeckArchetypesForTest,
  withoutAwaitingCityleagueEvents,
} from "@app/utils/cityleagueAwaitingServer";
import { NO_STORE, getJson } from "@app/utils/coreApi";
import { isWithinDeckArchetypeWait } from "@app/utils/deckArchetype";
import { lookupDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

vi.mock("@app/utils/coreApi", () => ({ NO_STORE: "no-store", getJson: vi.fn() }));
// 待つ期間の判定が何回呼ばれたかを数えるために包む(中身は本物のまま)
vi.mock("@app/utils/deckArchetype", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@app/utils/deckArchetype")>();

  return { ...actual, isWithinDeckArchetypeWait: vi.fn(actual.isWithinDeckArchetypeWait) };
});
vi.mock("@app/utils/deckArchetypeServer", () => ({ lookupDeckArchetypesByCodes: vi.fn() }));

const day = (date: string) => `${date}T00:00:00+09:00`;

// 直近(待つ期間)の結果。優勝デッキのコードだけを持たせる
const recent = (id: number, date: string, deckCode: string, leagueType = 1) => ({
  official_event_id: id,
  league_type: leagueType,
  date: day(date),
  cityleague_schedule_id: "2027s1",
  results: [{ rank: 1, deck_code: deckCode }],
});

const entry = (deckCode: string) => ({
  deckCode,
  archetypeName: "ドラパルトex",
  variantName: null,
  label: "ドラパルトex",
  sprites: [],
});

const ref = (id: number, date: string) => ({ id, date: day(date) });
const ids = (refs: { id: number }[]) => refs.map((r) => r.id);

// P- で始まるコードは索引にまだ無い
function stubUpstream(results: ReturnType<typeof recent>[]) {
  vi.mocked(getJson).mockResolvedValue({ count: results.length, event_results: results });
  vi.mocked(lookupDeckArchetypesByCodes).mockImplementation(async (codes) => ({
    decks: Object.fromEntries(codes.filter((c) => !c.startsWith("P-")).map((c) => [c, entry(c)])),
    pending: codes.filter((c) => c.startsWith("P-")),
  }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-17T20:00:00+09:00") });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  resetRecentDeckArchetypesForTest();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(getJson).mockReset();
  vi.mocked(lookupDeckArchetypesByCodes).mockReset();
});

describe("getRecentDeckArchetypes", () => {
  it("今日・昨日の結果を全リーグぶん今の答えで取り、分類待ちの大会を判定する", async () => {
    stubUpstream([recent(1, "2026-10-17", "P-1"), recent(2, "2026-10-16", "R-1")]);

    const snapshot = await getRecentDeckArchetypes();

    expect(snapshot).toMatchObject({
      today: "2026-10-17",
      checked: [1, 2],
      awaiting: [1],
      decks: { "R-1": entry("R-1") },
    });
    expect(vi.mocked(getJson).mock.calls[0]).toEqual([
      "/api/v1beta/cityleague_results?from_date=2026-10-16&to_date=2026-10-17",
      NO_STORE,
    ]);
    // バトラボにも Data Cache を通さず聞く(URL ごとに切れるキャッシュは画面ごとの食い違いの元)
    expect(vi.mocked(lookupDeckArchetypesByCodes).mock.calls[0][1]).toEqual({ fresh: true });
  });

  // 画面ごとに別々に判定すると食い違う。同じ刻みの中はどの画面にも同じ 1 枚を返す
  it("30 秒刻みの中では作り直さず、刻みが変わったら作り直す", async () => {
    stubUpstream([recent(1, "2026-10-17", "R-1")]);

    const first = await getRecentDeckArchetypes();
    expect(await getRecentDeckArchetypes()).toBe(first);
    expect(getJson).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-10-17T20:00:30+09:00"));
    await getRecentDeckArchetypes();
    expect(getJson).toHaveBeenCalledTimes(2);
  });

  it("作れなければ null。その刻みのあいだは失敗も覚える", async () => {
    vi.mocked(getJson).mockRejectedValue(new Error("core-apiserver responded 502"));

    expect(await getRecentDeckArchetypes()).toBeNull();
    expect(await getRecentDeckArchetypes()).toBeNull();
    expect(getJson).toHaveBeenCalledTimes(1);
  });
});

describe("pickRecentDeckArchetypes", () => {
  it("リーグ・日付で絞り、出してよい大会の種類だけを返す", async () => {
    stubUpstream([
      recent(1, "2026-10-17", "P-1"),
      recent(2, "2026-10-17", "R-1"),
      recent(3, "2026-10-16", "R-2"),
      recent(4, "2026-10-17", "R-3", 2),
    ]);
    const snapshot = (await getRecentDeckArchetypes())!;

    expect(pickRecentDeckArchetypes(snapshot, { leagueType: 1, date: "2026-10-17" })).toEqual({
      today: "2026-10-17",
      checked: [1, 2],
      awaiting: [1],
      decks: { "R-1": entry("R-1") },
    });
  });
});

describe("withoutAwaitingCityleagueEvents", () => {
  // 旧シーズンのハブなど、ほとんどの表示は直近の大会を含まない。余計な往復をしない
  it("待つ期間(今日・昨日)の大会が無ければ、何も取らずにそのまま返す", async () => {
    const refs = [ref(1, "2026-10-15"), ref(2, "2026-09-26")];

    expect(await withoutAwaitingCityleagueEvents(refs, (r) => r)).toBe(refs);
    expect(getJson).not.toHaveBeenCalled();
  });

  it("分類待ちの大会と、判定に見当たらない大会を除き、期間外はそのまま出す", async () => {
    stubUpstream([recent(1, "2026-10-17", "P-1"), recent(2, "2026-10-16", "R-1")]);

    const refs = [
      ref(1, "2026-10-17"), // 分類待ち
      ref(2, "2026-10-16"), // 揃っている
      ref(3, "2026-10-17"), // 判定を作ったあとに登録された
      ref(4, "2026-10-15"), // 期間外
    ];

    expect(ids(await withoutAwaitingCityleagueEvents(refs, (r) => r))).toEqual([2, 4]);
  });

  /*
   * ハブや「最近開催」は結果のある全大会(8,000 件超)を渡してくる。1 件ごとに日付を読み直すと
   * それだけで 1 回 19ms かかり、一覧ページの「最近開催」の処理時間の 3 分の 2 を占めていた。
   * 開催日は限られた種類しか無いので、同じ日付は一度だけ判定する。
   */
  it("待つ期間の大会が無いとき、同じ開催日は一度だけ判定する", async () => {
    // 100 日ぶんの開催日に、各 80 大会(計 8,000 件)。どれも待つ期間より前
    const refs = Array.from({ length: 8000 }, (_, i) => {
      const date = new Date(Date.UTC(2026, 5, 1 + (i % 100)));

      return ref(i + 1, date.toISOString().slice(0, 10));
    });
    vi.mocked(isWithinDeckArchetypeWait).mockClear();

    expect(await withoutAwaitingCityleagueEvents(refs, (r) => r)).toBe(refs);
    expect(isWithinDeckArchetypeWait).toHaveBeenCalledTimes(100);
    expect(getJson).not.toHaveBeenCalled();
  });

  it("同じ開催日の大会が並んでいても、1 件ずつ判定したときと同じ結果になる", async () => {
    stubUpstream([
      recent(1, "2026-10-17", "P-1"),
      recent(2, "2026-10-17", "R-1"),
      recent(3, "2026-10-16", "R-2"),
    ]);

    const refs = [
      ref(10, "2026-10-15"), // 期間外(同じ日が続く)
      ref(11, "2026-10-15"),
      ref(1, "2026-10-17"), // 分類待ち
      ref(2, "2026-10-17"), // 揃っている(分類待ちと同じ日)
      ref(4, "2026-10-17"), // 判定を作ったあとに登録された(同じ日)
      ref(3, "2026-10-16"), // 揃っている
      ref(12, "2026-10-15"),
    ];

    expect(ids(await withoutAwaitingCityleagueEvents(refs, (r) => r))).toEqual([10, 11, 2, 3, 12]);
  });

  // 選手ページの結果は開催日を Date で持つことがある。文字列と同じ扱いになること
  it("開催日が Date でも、日付が読めない値でも、文字列のときと同じ扱いにする", async () => {
    stubUpstream([recent(1, "2026-10-17", "P-1"), recent(2, "2026-10-16", "R-1")]);

    const items = [
      { id: 1, date: new Date("2026-10-17T00:00:00+09:00") }, // 分類待ち
      { id: 2, date: new Date("2026-10-16T00:00:00+09:00") }, // 揃っている
      { id: 2, date: new Date("2026-10-16T00:00:00+09:00") }, // 同じ日時の別の Date
      { id: 5, date: new Date("2026-10-15T00:00:00+09:00") }, // 期間外
      { id: 6, date: "日付ではない" }, // 読めない日付は期間外として出す
      { id: 7, date: new Date(NaN) },
    ];

    expect(ids(await withoutAwaitingCityleagueEvents(items, (item) => item))).toEqual([
      2, 2, 5, 6, 7,
    ]);
  });

  // 上流や vslab の障害で新しい結果がどこにも出なくなるのを避ける
  it("判定を作れなければ、何も隠さない", async () => {
    vi.mocked(getJson).mockRejectedValue(new Error("core-apiserver responded 502"));

    const refs = [ref(1, "2026-10-17")];

    expect(await withoutAwaitingCityleagueEvents(refs, (r) => r)).toEqual(refs);
  });
});
