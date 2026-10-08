import { describe, expect, it } from "vitest";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { CITYLEAGUE_SEARCH_DAYS } from "@app/utils/cityleagueListPage";
import {
  CITYLEAGUE_REFRESH_MERGE_DAYS,
  CITYLEAGUE_REFRESH_MIN_INTERVAL_MS,
  isHeadRefreshDue,
  mergeHeadResults,
  pickLatestDay,
  planHeadRefresh,
} from "@app/utils/cityleagueListRefresh";

// 上流と同じく JST 0:00 を表す値で持つ
function result(id: number, date: string): CityleagueResultType {
  return {
    official_event_id: id,
    date: `${date}T00:00:00+09:00`,
  } as unknown as CityleagueResultType;
}

const ids = (items: CityleagueResultType[] | null) =>
  items?.map((item) => item.official_event_id) ?? null;

describe("isHeadRefreshDue", () => {
  it("まだ一度もそろえていなければ取り直す", () => {
    expect(isHeadRefreshDue(null, 1_000)).toBe(true);
  });

  it("前回から間隔が空いていなければ取り直さない", () => {
    const now = 10 * CITYLEAGUE_REFRESH_MIN_INTERVAL_MS;
    expect(isHeadRefreshDue(now - CITYLEAGUE_REFRESH_MIN_INTERVAL_MS + 1, now)).toBe(false);
    expect(isHeadRefreshDue(now - CITYLEAGUE_REFRESH_MIN_INTERVAL_MS, now)).toBe(true);
  });
});

describe("planHeadRefresh", () => {
  it("先頭の日から起点までを取り直して差し込む", () => {
    expect(planHeadRefresh("2026-10-07", "2026-10-08", "2026-09-26")).toEqual({
      mode: "merge",
      fromDate: "2026-10-07",
      toDate: "2026-10-08",
    });
  });

  it("先頭が今日でも、今日の追加ぶんを拾うために取り直す", () => {
    expect(planHeadRefresh("2026-10-08", "2026-10-08", "2026-09-26")).toEqual({
      mode: "merge",
      fromDate: "2026-10-08",
      toDate: "2026-10-08",
    });
  });

  it("離れすぎていたら1ページ目から出し直す", () => {
    // 差し込むのは CITYLEAGUE_REFRESH_MERGE_DAYS 日未満の差まで
    expect(planHeadRefresh("2026-10-02", "2026-10-08", null)?.mode).toBe("merge");
    expect(planHeadRefresh(`2026-10-0${8 - CITYLEAGUE_REFRESH_MERGE_DAYS}`, "2026-10-08", null))
      .toEqual({
        mode: "reset",
        // 初回の読み込みと同じく CITYLEAGUE_SEARCH_DAYS 日ぶん遡る
        fromDate: "2026-09-25",
        toDate: "2026-10-08",
      });
    expect(CITYLEAGUE_SEARCH_DAYS).toBe(14);
  });

  it("出し直しはスケジュールの開始日より前を探さない", () => {
    expect(planHeadRefresh("2026-09-27", "2026-10-08", "2026-09-26")).toEqual({
      mode: "reset",
      fromDate: "2026-09-26",
      toDate: "2026-10-08",
    });
  });

  it("一覧が空なら1ページ目を探す", () => {
    expect(planHeadRefresh(null, "2026-10-08", "2026-10-05")).toEqual({
      mode: "reset",
      fromDate: "2026-10-05",
      toDate: "2026-10-08",
    });
  });

  it("先頭が起点より新しければ触らない", () => {
    expect(planHeadRefresh("2026-10-09", "2026-10-08", null)).toBeNull();
  });
});

describe("mergeHeadResults", () => {
  const current = [
    result(11, "2026-10-07"),
    result(12, "2026-10-07"),
    result(21, "2026-10-06"),
  ];

  it("新しい日を上に差し込み、続きとして読んだ日は残す", () => {
    const fetched = [result(1, "2026-10-08"), result(11, "2026-10-07"), result(12, "2026-10-07")];

    expect(ids(mergeHeadResults(current, fetched, "2026-10-07"))).toEqual([1, 11, 12, 21]);
  });

  it("先頭の日に後から登録された大会も、取り直した並びで入る", () => {
    const fetched = [result(11, "2026-10-07"), result(13, "2026-10-07"), result(12, "2026-10-07")];

    expect(ids(mergeHeadResults(current, fetched, "2026-10-07"))).toEqual([11, 13, 12, 21]);
  });

  it("並びが変わらなければ null(描き直さない)", () => {
    const fetched = [result(11, "2026-10-07"), result(12, "2026-10-07")];

    expect(mergeHeadResults(current, fetched, "2026-10-07")).toBeNull();
  });
});

describe("pickLatestDay", () => {
  it("最も新しい日のぶんと、続きの起点を返す", () => {
    const picked = pickLatestDay([
      result(1, "2026-10-08"),
      result(2, "2026-10-08"),
      result(3, "2026-10-07"),
    ]);

    expect(picked?.date).toBe("2026-10-08");
    expect(ids(picked?.results ?? null)).toEqual([1, 2]);
    expect(picked?.nextFromDate).toBe("2026-10-07");
  });

  it("結果が無ければ null", () => {
    expect(pickLatestDay([])).toBeNull();
  });
});
