import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRecentDeckArchetypes,
  pickRecentDeckArchetypes,
  resetRecentDeckArchetypesForTest,
  withoutAwaitingCityleagueEvents,
} from "@app/utils/cityleagueAwaitingServer";
import { NO_STORE, getJson } from "@app/utils/coreApi";
import { lookupDeckArchetypesByCodes } from "@app/utils/deckArchetypeServer";

vi.mock("@app/utils/coreApi", () => ({ NO_STORE: "no-store", getJson: vi.fn() }));
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

  // 上流や vslab の障害で新しい結果がどこにも出なくなるのを避ける
  it("判定を作れなければ、何も隠さない", async () => {
    vi.mocked(getJson).mockRejectedValue(new Error("core-apiserver responded 502"));

    const refs = [ref(1, "2026-10-17")];

    expect(await withoutAwaitingCityleagueEvents(refs, (r) => r)).toEqual(refs);
  });
});
