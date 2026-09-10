import { describe, expect, it } from "vitest";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { pickCityleagueScheduleState } from "@app/utils/cityleagueSchedule";

// 上流(core-apiserver)は JST 0:00 を +09:00 付きで返す。実データと同じ形で組む
function schedule(
  id: string,
  fromDate: string,
  toDate: string,
): CityleagueScheduleType {
  return {
    id,
    title: id,
    from_date: `${fromDate}T00:00:00+09:00` as unknown as Date,
    to_date: `${toDate}T00:00:00+09:00` as unknown as Date,
  };
}

// 実データの並び(新しいシーズンが先頭)。順序に依存していないことも兼ねて確認する
const SCHEDULES = [
  schedule("2027s1", "2026-09-26", "2026-11-15"),
  schedule("2026s4", "2026-03-14", "2026-05-06"),
  schedule("2026s3", "2026-01-10", "2026-03-08"),
];

describe("pickCityleagueScheduleState", () => {
  it("今日を含むシーズンを ongoing にする", () => {
    const { ongoing, next } = pickCityleagueScheduleState(SCHEDULES, "2026-10-01");

    expect(ongoing?.id).toBe("2027s1");
    expect(next).toBeNull();
  });

  // 開催初日・最終日も「開催期間中」。ここを取り違えるとシーズンの端でパネルが入れ替わる
  it("開始日と終了日は開催期間中に含める", () => {
    expect(pickCityleagueScheduleState(SCHEDULES, "2026-09-26").ongoing?.id).toBe("2027s1");
    expect(pickCityleagueScheduleState(SCHEDULES, "2026-11-15").ongoing?.id).toBe("2027s1");
  });

  it("期間外は ongoing が null になり、次に始まるシーズンを next にする", () => {
    const { ongoing, next } = pickCityleagueScheduleState(SCHEDULES, "2026-09-10");

    expect(ongoing).toBeNull();
    expect(next?.id).toBe("2027s1");
  });

  // 未来のシーズンが複数あっても、案内するのは直近の1つだけ
  it("未来のシーズンが複数あれば最も早く始まるものを next にする", () => {
    const { next } = pickCityleagueScheduleState(SCHEDULES, "2026-01-05");

    expect(next?.id).toBe("2026s3");
  });

  it("次のシーズンが未発表なら next は null", () => {
    const { ongoing, next } = pickCityleagueScheduleState(SCHEDULES, "2026-11-16");

    expect(ongoing).toBeNull();
    expect(next).toBeNull();
  });

  it("取得できなかった・1件も無い場合はどちらも null", () => {
    expect(pickCityleagueScheduleState(undefined, "2026-09-10")).toEqual({
      ongoing: null,
      next: null,
    });
    expect(pickCityleagueScheduleState([], "2026-09-10")).toEqual({
      ongoing: null,
      next: null,
    });
  });

  // 1件でも読めない日付が混ざると toJSTDateString() が例外を投げ、パネルごと落ちる
  it("日付が読めない・前後が逆のシーズンは無視して他を選ぶ", () => {
    const broken = [
      schedule("broken", "", ""),
      schedule("reversed", "2026-11-15", "2026-09-26"),
      ...SCHEDULES,
    ];

    const { ongoing, next } = pickCityleagueScheduleState(broken, "2026-09-10");

    expect(ongoing).toBeNull();
    expect(next?.id).toBe("2027s1");
  });
});
