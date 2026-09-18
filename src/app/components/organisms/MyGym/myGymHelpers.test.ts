import { describe, expect, it } from "vitest";

import {
  getEventGroupVenues,
  groupEventsByDate,
  isEventGroupExpanded,
  MY_GYM_INITIAL_EXPANDED_GROUPS,
} from "@app/components/organisms/MyGym/myGymHelpers";
import { OfficialEventType } from "@app/types/official_event";

describe("isEventGroupExpanded", () => {
  it("触っていなければ先頭から MY_GYM_INITIAL_EXPANDED_GROUPS 日ぶんだけ開く", () => {
    const indexes = [0, 1, 2, 3];

    expect(indexes.map((i) => isEventGroupExpanded({}, `2026-09-1${i}`, i))).toEqual(
      indexes.map((i) => i < MY_GYM_INITIAL_EXPANDED_GROUPS),
    );
  });

  it("触った日付はその開閉が勝つ", () => {
    // 既定で開く先頭を畳む / 既定で畳まれている先を開く
    expect(isEventGroupExpanded({ "2026-09-18": false }, "2026-09-18", 0)).toBe(false);
    expect(isEventGroupExpanded({ "2026-09-22": true }, "2026-09-22", 4)).toBe(true);
  });

  it("再取得で日付が入れ替わっても、触っていない日付は既定のまま", () => {
    // 今日ぶんが終わって先頭が 19 日に繰り上がった状況。
    // 18 日を開いた記録が残っていても、繰り上がった日付には引き継がれない
    const overrides = { "2026-09-18": true };

    expect(isEventGroupExpanded(overrides, "2026-09-19", 0)).toBe(
      0 < MY_GYM_INITIAL_EXPANDED_GROUPS,
    );
    expect(isEventGroupExpanded(overrides, "2026-09-20", 1)).toBe(
      1 < MY_GYM_INITIAL_EXPANDED_GROUPS,
    );
  });
});

// 会場の判定に要るフィールドだけを持つ最小のイベント。
// 実体は上流の全フィールドを持つが、ここで見るのは shop_name / venue / date だけ
function event(shopName: string | null, venue: string | null, date = "2026-09-18") {
  return {
    id: `${date}-${shopName ?? venue ?? ""}`,
    date: `${date}T00:00:00+09:00`,
    shop_name: shopName,
    venue,
  } as unknown as OfficialEventType;
}

describe("getEventGroupVenues", () => {
  it("重複を落として出現順に返す", () => {
    expect(
      getEventGroupVenues([
        event("ドラゴンスター町田店", null),
        event("カードショップ竜星のPAO町田店", null),
        event("ドラゴンスター町田店", null),
      ]),
    ).toEqual(["ドラゴンスター町田店", "カードショップ竜星のPAO町田店"]);
  });

  it("shop_name が無ければ venue を使い、どちらも無ければ落とす", () => {
    expect(getEventGroupVenues([event(null, "みなとみらいホール")])).toEqual([
      "みなとみらいホール",
    ]);
    expect(getEventGroupVenues([event("  ", " ")])).toEqual([]);
    expect(getEventGroupVenues([])).toEqual([]);
  });
});

describe("groupEventsByDate", () => {
  it("日付ごとにまとめ、その日の会場も持たせる", () => {
    const groups = groupEventsByDate([
      event("A店", null, "2026-09-18"),
      event("A店", null, "2026-09-18"),
      event("B店", null, "2026-09-18"),
      event("C店", null, "2026-09-19"),
    ]);

    expect(groups.map((g) => g.dateKey)).toEqual(["2026-09-18", "2026-09-19"]);
    expect(groups.map((g) => g.events.length)).toEqual([3, 1]);
    expect(groups.map((g) => g.venues)).toEqual([["A店", "B店"], ["C店"]]);
  });
});
