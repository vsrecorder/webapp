import { describe, expect, it } from "vitest";

import { MY_GYM_EVENT_RANGE_DAYS } from "@app/utils/myGymEventRange";
import {
  currentMyGymSkeleton,
  formatMyGymSkeleton,
  MyGymSkeletonShape,
  myGymSkeletonHeightRem,
  parseMyGymSkeleton,
} from "@app/utils/myGymSkeleton";

const SHAPES: MyGymSkeletonShape[] = [
  { kind: "unregistered" },
  { kind: "noEvents" },
  { kind: "rows", rows: 1 },
  { kind: "rows", rows: MY_GYM_EVENT_RANGE_DAYS },
];

describe("formatMyGymSkeleton / parseMyGymSkeleton", () => {
  it("cookie の値にして読み戻せる", () => {
    for (const shape of SHAPES) {
      expect(parseMyGymSkeleton(formatMyGymSkeleton(shape))).toEqual(shape);
    }
  });

  it("読めない値は null(cookie は書き換えられる)", () => {
    expect(parseMyGymSkeleton(undefined)).toBeNull();
    expect(parseMyGymSkeleton("")).toBeNull();
    expect(parseMyGymSkeleton("0")).toBeNull();
    expect(parseMyGymSkeleton("1.5")).toBeNull();
    expect(parseMyGymSkeleton("-3")).toBeNull();
    expect(parseMyGymSkeleton(String(MY_GYM_EVENT_RANGE_DAYS + 1))).toBeNull();
    expect(parseMyGymSkeleton("rows")).toBeNull();
  });
});

describe("myGymSkeletonHeightRem", () => {
  it("実体の実測に合わせた高さを返す(ルート16pxで 184 / 106 / 354px)", () => {
    expect(myGymSkeletonHeightRem({ kind: "unregistered" }) * 16).toBe(184);
    expect(myGymSkeletonHeightRem({ kind: "noEvents" }) * 16).toBe(106);
    expect(myGymSkeletonHeightRem({ kind: "rows", rows: 7 }) * 16).toBe(354);
  });

  it("日付が1本増えると 1行(2rem)＋ gap-3(0.75rem)ぶん伸びる", () => {
    const one = myGymSkeletonHeightRem({ kind: "rows", rows: 1 });
    const two = myGymSkeletonHeightRem({ kind: "rows", rows: 2 });

    expect(two - one).toBeCloseTo(2.75);
  });
});

describe("currentMyGymSkeleton", () => {
  it("登録・予定の有無で形を分ける", () => {
    expect(currentMyGymSkeleton([], 0)).toEqual({ kind: "unregistered" });
    // 未登録の判定が先。店舗が無ければ日付グループも出ない
    expect(currentMyGymSkeleton([], 3)).toEqual({ kind: "unregistered" });
    expect(currentMyGymSkeleton([{}], 0)).toEqual({ kind: "noEvents" });
    expect(currentMyGymSkeleton([{}, {}], 4)).toEqual({ kind: "rows", rows: 4 });
  });
});
