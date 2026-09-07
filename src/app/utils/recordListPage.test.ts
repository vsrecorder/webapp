import { describe, expect, it } from "vitest";

import { RecordGetResponseType, RecordType } from "@app/types/record";
import {
  attachRecordCardDetails,
  collectRecordCardIds,
  resolveRecordEventType,
  stepRecordPage,
  toRecordPage,
} from "@app/utils/recordListPage";

// テスト用の記録(id・カーソルと種別に関わる項目だけ持つ)
const record = (
  id: string,
  data: Partial<RecordType["data"]> = {},
  cursor = `c-${id}`,
): RecordType =>
  ({
    cursor,
    data: { id, official_event_id: 0, tonamel_event_id: "", unofficial_event_id: "", deck_id: "", ...data },
  }) as RecordType;

const response = (
  records: RecordType[],
  extra: Partial<RecordGetResponseType> = {},
): RecordGetResponseType => ({ limit: 10, offset: 0, cursor: "", records, ...extra });

describe("resolveRecordEventType", () => {
  it("公式 → Tonamel → 自由形式の順で判定し、どれも無ければ null", () => {
    expect(resolveRecordEventType(record("a", { official_event_id: 5 }).data)).toBe("official");
    expect(resolveRecordEventType(record("a", { tonamel_event_id: "abc" }).data)).toBe("tonamel");
    expect(resolveRecordEventType(record("a", { unofficial_event_id: "u1" }).data)).toBe("unofficial");
    expect(resolveRecordEventType(record("a").data)).toBeNull();
  });
});

describe("toRecordPage", () => {
  it("limit+1 件あれば limit 件に切り、次ページありを付ける", () => {
    const page = toRecordPage(response([record("a"), record("b"), record("c")]), 2);
    expect(page.records.map((r) => r.data.id)).toEqual(["a", "b"]);
    expect(page.limit).toBe(2);
    expect(page.has_next).toBe(true);
  });

  it("limit 件以下なら次ページなし", () => {
    const page = toRecordPage(response([record("a")]), 2);
    expect(page.records).toHaveLength(1);
    expect(page.has_next).toBe(false);
  });

  it("想定外の形(records が配列でない)はそのまま返す", () => {
    const broken = { error: "x" } as unknown as RecordGetResponseType;
    expect(toRecordPage(broken)).toBe(broken);
  });
});

describe("stepRecordPage", () => {
  it("取得済みの記録は足さず、カーソルを末尾へ進める", () => {
    const step = stepRecordPage(
      response([record("a"), record("b")], { has_next: true }),
      new Set(["a"]),
      "",
    );
    expect(step.appended.map((r) => r.data.id)).toEqual(["b"]);
    expect(step.nextCursor).toBe("c-b");
    expect(step.hasNext).toBe(true);
  });

  it("has_next が false なら続きなし", () => {
    const step = stepRecordPage(response([record("a")], { has_next: false }), new Set(), "");
    expect(step.hasNext).toBe(false);
  });

  it("has_next の無い応答(古い形)は 1ページぶん埋まっているかで決める", () => {
    expect(stepRecordPage(response([record("a"), record("b")], { limit: 2 }), new Set(), "").hasNext).toBe(true);
    expect(stepRecordPage(response([record("a")], { limit: 2 }), new Set(), "").hasNext).toBe(false);
  });

  it("カーソルが進まない(同じページが返る)ときは続きなしとして打ち切る", () => {
    const step = stepRecordPage(response([record("a")], { has_next: true }), new Set(["a"]), "c-a");
    expect(step.appended).toEqual([]);
    expect(step.nextCursor).toBe("c-a");
    expect(step.hasNext).toBe(false);
  });

  it("0件なら何も足さず続きなし", () => {
    const step = stepRecordPage(response([], { has_next: false }), new Set(), "c-x");
    expect(step).toEqual({ appended: [], nextCursor: "c-x", hasNext: false });
  });
});

describe("collectRecordCardIds", () => {
  it("デッキ・イベントの ID を種別ごとに重複なく集める", () => {
    const ids = collectRecordCardIds([
      record("a", { deck_id: "d1", official_event_id: 10 }),
      record("b", { deck_id: "d1", official_event_id: 10 }),
      record("c", { deck_id: "d2", tonamel_event_id: "t1" }),
      record("d", { unofficial_event_id: "u1" }),
      record("e"),
    ]);
    expect(ids).toEqual({
      deckIds: ["d1", "d2"],
      officialEventIds: [10],
      tonamelEventIds: ["t1"],
      unofficialEventIds: ["u1"],
    });
  });
});

describe("attachRecordCardDetails", () => {
  const officialEvent = { id: 10, title: "ジムバトル" } as never;
  const deck = { id: "d1", name: "デッキ", pokemon_sprites: [] };
  const matches = { total: 1, wins: 1, losses: 0, draws: 0, has_group_match: false, has_bo3: false };
  const lookups = {
    decks: new Map([["d1", deck]]),
    officialEvents: new Map([[10, officialEvent]]),
    tonamelEvents: new Map(),
    unofficialEvents: new Map(),
    matches: new Map([["a", matches]]),
  };

  it("取れた周辺情報を各記録に付ける", () => {
    const [a] = attachRecordCardDetails([record("a", { deck_id: "d1", official_event_id: 10 })], lookups);
    expect(a.details).toEqual({ deck, official_event: officialEvent, matches });
  });

  it("取れなかった項目・紐付いていない項目は付けない(カードが自分で取る/取らない)", () => {
    const [b] = attachRecordCardDetails([record("b", { deck_id: "d9", tonamel_event_id: "t9" })], lookups);
    expect(b.details).toEqual({});
    expect(Object.hasOwn(b.details!, "deck")).toBe(false);
  });

  it("元の記録は書き換えない", () => {
    const original = record("a", { deck_id: "d1" });
    attachRecordCardDetails([original], lookups);
    expect(original.details).toBeUndefined();
  });
});
