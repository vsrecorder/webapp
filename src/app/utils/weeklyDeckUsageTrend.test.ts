import { describe, expect, it } from "vitest";

import {
  buildWeeklyDeckUsageTrend,
  buildWeeklyDeckUsageTrendMembers,
  isTrendFingerprint,
  changeTrendRangeEdge,
  normalizeTrendRange,
  trendRangeFromQuery,
  trendWeekCount,
  trendWeeks,
} from "@app/utils/weeklyDeckUsageTrend";

import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

const row = (id: string, count: number): WeeklyDeckUsageItemType => ({
  fingerprint: id,
  count,
  usage_rate: count / 100,
  wins: 0,
  losses: 0,
  win_rate: 0,
  pokemon_sprites: [{ id, position: 1 }],
});

const other = (members: WeeklyDeckUsageItemType[]): WeeklyDeckUsageItemType => ({
  ...row("", members.reduce((n, m) => n + m.count, 0)),
  pokemon_sprites: [],
  members,
});

const week = (start: string, decks: WeeklyDeckUsageItemType[]): WeeklyDeckUsageStatType => ({
  week: start,
  week_start: start,
  week_end: start,
  grouping: "first_sprite",
  total_votes: 100,
  contributor_count: 10,
  decks,
});

describe("buildWeeklyDeckUsageTrend", () => {
  it("「その他」を除いた並び順を順位にし、その他の内訳は使用率だけ拾う", () => {
    const trend = buildWeeklyDeckUsageTrend(
      [
        week("2026-09-07", [row("A", 30), row("B", 20), other([row("C", 2)])]),
        week("2026-09-14", [row("C", 40), row("A", 10), other([row("B", 2)])]),
      ],
      2,
    );

    expect(trend.weeks.map((w) => w.week)).toEqual(["2026-09-07", "2026-09-14"]);
    const byId = Object.fromEntries(trend.series.map((s) => [s.fingerprint, s.points]));
    expect(byId.A.map((p) => p.rank)).toEqual([1, 2]);
    expect(byId.B).toEqual([
      { rank: 2, usage_rate: 0.2, count: 20 },
      { rank: null, usage_rate: 0.02, count: 2 },
    ]);
    expect(byId.C.map((p) => p.rank)).toEqual([null, 1]);
  });

  it("どの週でも上位 limit 位に入らなかった系列は含めない", () => {
    const trend = buildWeeklyDeckUsageTrend(
      [week("2026-09-07", [row("A", 30), row("B", 20), row("C", 10)])],
      2,
    );
    expect(trend.series.map((s) => s.fingerprint)).toEqual(["A", "B"]);
  });

  it("最新週の順位順に並べ、最新週で圏外の系列は最高順位の順で後ろに置く", () => {
    const trend = buildWeeklyDeckUsageTrend(
      [
        week("2026-09-07", [row("A", 30), row("B", 20), row("C", 10)]),
        week("2026-09-14", [row("C", 30), row("D", 20), row("A", 10)]),
      ],
      2,
    );
    expect(trend.series.map((s) => s.fingerprint)).toEqual(["C", "D", "A", "B"]);
  });

  it("その週に1件も無い系列は順位・使用率とも null になる", () => {
    const trend = buildWeeklyDeckUsageTrend(
      [week("2026-09-07", []), week("2026-09-14", [row("A", 30)])],
      2,
    );
    expect(trend.series[0].points[0]).toEqual({ rank: null, usage_rate: null, count: 0 });
  });
});

describe("期間の扱い", () => {
  // 今週 = 2026-09-21。選択肢は 26 週前(2026-03-30)まで
  const CURRENT = "2026-09-21";
  const EARLIEST = "2026-03-30";

  it("週数と週の並びは両端を含む", () => {
    const range = { from: "2026-08-31", to: "2026-09-14" };
    expect(trendWeekCount(range)).toBe(3);
    expect(trendWeeks(range)).toEqual(["2026-08-31", "2026-09-07", "2026-09-14"]);
  });

  it("未指定や不正な指定は先週までの6週にする", () => {
    const def = { from: "2026-08-10", to: "2026-09-14" };
    expect(normalizeTrendRange(null, null, CURRENT)).toEqual(def);
    // 月曜日でない
    expect(normalizeTrendRange("2026-08-11", "2026-09-14", CURRENT)).toEqual(def);
    // 前後が逆・1週だけ
    expect(normalizeTrendRange("2026-09-14", "2026-08-10", CURRENT)).toEqual(def);
    expect(normalizeTrendRange("2026-09-14", "2026-09-14", CURRENT)).toEqual(def);
    // 13週(上限超え)
    expect(normalizeTrendRange("2026-06-22", "2026-09-14", CURRENT)).toEqual(def);
    // 今週より先
    expect(normalizeTrendRange("2026-09-14", "2026-09-28", CURRENT)).toEqual(def);
    // 選べる範囲より前
    expect(normalizeTrendRange("2026-03-23", "2026-04-06", CURRENT, EARLIEST)).toEqual(def);
  });

  it("正しい指定はそのまま使う(今週を含んでもよい)", () => {
    expect(normalizeTrendRange("2026-06-29", "2026-09-14", CURRENT)).toEqual({
      from: "2026-06-29",
      to: "2026-09-14",
    });
    expect(normalizeTrendRange("2026-09-14", "2026-09-21", CURRENT)).toEqual({
      from: "2026-09-14",
      to: "2026-09-21",
    });
  });

  const range = { from: "2026-08-10", to: "2026-09-14" }; // 6週

  it("範囲内に収まる端の変更は反対側を動かさない", () => {
    expect(changeTrendRangeEdge(range, "from", "2026-07-06", EARLIEST, CURRENT)).toEqual({
      from: "2026-07-06",
      to: "2026-09-14",
    });
    expect(changeTrendRangeEdge(range, "to", "2026-08-24", EARLIEST, CURRENT)).toEqual({
      from: "2026-08-10",
      to: "2026-08-24",
    });
  });

  it("長くなりすぎる変更は、上限の12週まで反対側を寄せる", () => {
    expect(changeTrendRangeEdge(range, "from", "2026-04-06", EARLIEST, CURRENT)).toEqual({
      from: "2026-04-06",
      to: "2026-06-22",
    });
    expect(
      changeTrendRangeEdge(
        { from: "2026-04-06", to: "2026-05-11" },
        "to",
        "2026-09-14",
        EARLIEST,
        CURRENT,
      ),
    ).toEqual({ from: "2026-06-29", to: "2026-09-14" });
  });

  it("前後が逆になる変更は、それまでの週数を保つように反対側をずらす", () => {
    // 開始週を終了週より後ろへ: 終了週が追従して6週のまま(今週で止まる)
    expect(
      changeTrendRangeEdge(
        { from: "2026-06-01", to: "2026-07-06" },
        "from",
        "2026-08-03",
        EARLIEST,
        CURRENT,
      ),
    ).toEqual({ from: "2026-08-03", to: "2026-09-07" });
    // 終了週を開始週より前へ: 開始週が追従して6週のまま
    expect(changeTrendRangeEdge(range, "to", "2026-07-20", EARLIEST, CURRENT)).toEqual({
      from: "2026-06-15",
      to: "2026-07-20",
    });
  });

  it("端に寄せきれないときは選べる範囲に収め、最低2週を保つ", () => {
    // 開始週を今週の直前へ: 終了週は今週で止まり2週になる
    expect(changeTrendRangeEdge(range, "from", "2026-09-14", EARLIEST, CURRENT)).toEqual({
      from: "2026-09-14",
      to: "2026-09-21",
    });
    // 終了週を最も古い週の次へ: 開始週は最も古い週で止まる
    expect(changeTrendRangeEdge(range, "to", "2026-04-06", EARLIEST, CURRENT)).toEqual({
      from: EARLIEST,
      to: "2026-04-06",
    });
  });
});

describe("trendRangeFromQuery(サーバ側の期間の検証)", () => {
  const CURRENT = "2026-09-21";
  const def = { from: "2026-08-10", to: "2026-09-14" };

  it("画面で選べる26週に1週の余裕を足した範囲まで受け付ける", () => {
    // 画面の最古の週(26週前 = 2026-03-30)と、その1週前(月曜0時をまたいだ画面向けの余裕)
    expect(trendRangeFromQuery("2026-03-30", "2026-04-13", CURRENT)).toEqual({
      from: "2026-03-30",
      to: "2026-04-13",
    });
    expect(trendRangeFromQuery("2026-03-23", "2026-04-06", CURRENT)).toEqual({
      from: "2026-03-23",
      to: "2026-04-06",
    });
  });

  it("それより前・未来の週は既定の期間に戻す", () => {
    expect(trendRangeFromQuery("2026-03-16", "2026-04-06", CURRENT)).toEqual(def);
    expect(trendRangeFromQuery("2020-01-06", "2020-02-03", CURRENT)).toEqual(def);
    expect(trendRangeFromQuery("2026-09-14", "2026-09-28", CURRENT)).toEqual(def);
  });
});

describe("buildWeeklyDeckUsageTrendMembers", () => {
  // 組み合わせ(2体目まで)の内訳を持つ、1体目でまとめた行
  const withMembers = (id: string, combos: [string, number][]): WeeklyDeckUsageItemType => ({
    ...row(id, combos.reduce((n, [, c]) => n + c, 0)),
    members: combos.map(([second, count]) => ({
      ...row(`${id},${second}`, count),
      pokemon_sprites: [
        { id, position: 1 },
        { id: second, position: 2 },
      ],
      previous_rank: 1,
    })),
  });

  it("週ごとに、選んだ系列の順位と組み合わせの内訳を返す(その他に回った週も拾う)", () => {
    const result = buildWeeklyDeckUsageTrendMembers(
      [
        week("2026-09-07", [row("B", 40), withMembers("A", [["X", 20], ["Y", 10]])]),
        week("2026-09-14", [row("B", 40), other([withMembers("A", [["X", 2]])])]),
        week("2026-09-21", [row("B", 40)]),
      ],
      "A",
    );

    expect(result.fingerprint).toBe("A");
    expect(result.weeks.map((w) => [w.week, w.rank, w.count])).toEqual([
      ["2026-09-07", 2, 30],
      ["2026-09-14", null, 2],
      ["2026-09-21", null, 0],
    ]);
    expect(result.weeks[0].members.map((m) => [m.fingerprint, m.count])).toEqual([
      ["A,X", 20],
      ["A,Y", 10],
    ]);
    // 前週比較は内訳に使わないので落とす
    expect(result.weeks[0].members[0]).not.toHaveProperty("previous_rank");
    expect(result.weeks[1].members.map((m) => m.fingerprint)).toEqual(["A,X"]);
    expect(result.weeks[2]).toMatchObject({ usage_rate: null, win_rate: null, members: [] });
  });
});

describe("isTrendFingerprint", () => {
  it("スプライトID1つの形だけを受け付ける", () => {
    expect(isTrendFingerprint("0887")).toBe(true);
    expect(isTrendFingerprint("0006_mega_x")).toBe(true);
    expect(isTrendFingerprint("0006,0018")).toBe(false);
    expect(isTrendFingerprint("../x")).toBe(false);
    expect(isTrendFingerprint("")).toBe(false);
    expect(isTrendFingerprint(null)).toBe(false);
  });
});
