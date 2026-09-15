import { describe, expect, it } from "vitest";

import { MatchSummaryType } from "@app/types/match";
import { RecordType } from "@app/types/record";
import {
  RECORDING_WINDOW_AFTER_MATCH_MS,
  RECORDING_WINDOW_NO_MATCH_MS,
  formatElapsedSince,
  isRecordingDismissed,
  isWithinRecordingWindow,
  pickTodaysRecord,
  recordingActivityOf,
  recordingDismissedValue,
} from "@app/utils/recordingNow";

// 記録1件ぶんの最小限の形。判定が見るのは id / created_at / event_date だけ。
function record(id: string, eventDate: string, createdAt: string): RecordType {
  return {
    cursor: "",
    data: {
      id,
      created_at: new Date(createdAt),
      official_event_id: 0,
      tonamel_event_id: "",
      friend_id: "",
      user_id: "u1",
      deck_id: "",
      deck_code_id: "",
      private_flg: true,
      ignore_stats_flg: false,
      regulation_id: 1,
      tcg_meister_url: "",
      memo: "",
      event_date: eventDate,
      unofficial_event_id: "",
      tags: [],
    },
  };
}

function summary(total: number, lastMatchAt: string | null): MatchSummaryType {
  return {
    total,
    wins: 0,
    losses: 0,
    draws: 0,
    has_group_match: false,
    has_bo3: false,
    last_match_at: lastMatchAt,
  };
}

describe("pickTodaysRecord", () => {
  // event_date は DATE カラムのため UTC 0時で返る。JSTの暦日として読めること
  it("今日(JST)のイベント日を持つ記録を返す", () => {
    const today = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T01:00:00Z");

    expect(pickTodaysRecord([today], "2026-09-15")?.data.id).toBe("r1");
  });

  it("一覧の並び(event_date DESC)のまま最初に見つかった1件を返す", () => {
    const newer = record("r2", "2026-09-15T00:00:00Z", "2026-09-15T09:00:00Z");
    const older = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T01:00:00Z");

    expect(pickTodaysRecord([newer, older], "2026-09-15")?.data.id).toBe("r2");
  });

  it("未来日の記録は候補にしない", () => {
    const future = record("r9", "2026-09-20T00:00:00Z", "2026-09-15T01:00:00Z");
    const today = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T02:00:00Z");

    // 大会の予定を先に作っていると一覧の先頭は未来日になる。飛ばして今日の記録を拾う
    expect(pickTodaysRecord([future, today], "2026-09-15")?.data.id).toBe("r1");
  });

  it("昨日の記録しか無ければ null", () => {
    const yesterday = record("r1", "2026-09-14T00:00:00Z", "2026-09-14T01:00:00Z");

    expect(pickTodaysRecord([yesterday], "2026-09-15")).toBeNull();
  });

  it("イベント日が未設定の記録は候補にしない", () => {
    const noDate = record("r1", "", "2026-09-15T01:00:00Z");

    expect(pickTodaysRecord([noDate], "2026-09-15")).toBeNull();
  });
});

describe("recordingActivityOf", () => {
  const r = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T00:40:00Z");
  const createdAt = new Date("2026-09-15T00:40:00Z").toISOString();

  it("対戦があれば最後の対戦を起点に、短いほうの窓(6時間)を使う", () => {
    // 試合の間隔はこれより短い。6時間空いたらその大会はもう終わっている
    expect(recordingActivityOf(r, summary(3, "2026-09-15T03:05:00Z"))).toEqual({
      lastActiveAt: "2026-09-15T03:05:00.000Z",
      windowMs: RECORDING_WINDOW_AFTER_MATCH_MS,
    });
  });

  it("対戦が0件なら記録を作った時刻を起点に、長いほうの窓(18時間)を使う", () => {
    // 大会の朝や前夜に記録だけ先に作る人がいるので、1戦目までを長く待つ
    expect(recordingActivityOf(r, summary(0, null))).toEqual({
      lastActiveAt: createdAt,
      windowMs: RECORDING_WINDOW_NO_MATCH_MS,
    });
  });

  it("集計が取れなくても記録の作成時刻と長いほうの窓に倒す", () => {
    expect(recordingActivityOf(r, null)).toEqual({
      lastActiveAt: createdAt,
      windowMs: RECORDING_WINDOW_NO_MATCH_MS,
    });
  });

  it("上流が last_match_at を返さない場合も記録の作成時刻と長いほうの窓に倒す", () => {
    // 起点が記録の作成時刻まで遡るぶん、窓も長いほうに揃える
    expect(recordingActivityOf(r, summary(3, null))).toEqual({
      lastActiveAt: createdAt,
      windowMs: RECORDING_WINDOW_NO_MATCH_MS,
    });
  });
});

describe("isWithinRecordingWindow", () => {
  const now = new Date("2026-09-15T12:00:00Z").getTime();
  const hoursAgo = (hours: number) =>
    new Date(now - hours * 60 * 60 * 1000).toISOString();

  it("窓の内側なら記録中", () => {
    expect(
      isWithinRecordingWindow(hoursAgo(5), RECORDING_WINDOW_AFTER_MATCH_MS, now),
    ).toBe(true);
    expect(
      isWithinRecordingWindow(
        new Date(now - RECORDING_WINDOW_AFTER_MATCH_MS).toISOString(),
        RECORDING_WINDOW_AFTER_MATCH_MS,
        now,
      ),
    ).toBe(true);
  });

  it("窓を過ぎたら記録中ではない", () => {
    expect(
      isWithinRecordingWindow(
        new Date(now - RECORDING_WINDOW_AFTER_MATCH_MS - 1000).toISOString(),
        RECORDING_WINDOW_AFTER_MATCH_MS,
        now,
      ),
    ).toBe(false);
  });

  // 同じ経過時間でも、対戦0件の記録(18時間)はまだ記録中のまま
  it("窓の長さで結果が変わる", () => {
    expect(
      isWithinRecordingWindow(hoursAgo(9), RECORDING_WINDOW_AFTER_MATCH_MS, now),
    ).toBe(false);
    expect(isWithinRecordingWindow(hoursAgo(9), RECORDING_WINDOW_NO_MATCH_MS, now)).toBe(
      true,
    );
    expect(isWithinRecordingWindow(hoursAgo(19), RECORDING_WINDOW_NO_MATCH_MS, now)).toBe(
      false,
    );
  });

  it("起点が取れなければ記録中ではない", () => {
    expect(isWithinRecordingWindow(null, RECORDING_WINDOW_NO_MATCH_MS, now)).toBe(false);
    expect(isWithinRecordingWindow("not a date", RECORDING_WINDOW_NO_MATCH_MS, now)).toBe(
      false,
    );
  });

  it("端末の時計が少し進んでいても記録中のまま", () => {
    // 未来の時刻で弾くと、数分のずれでカードが出なくなる
    expect(
      isWithinRecordingWindow("2026-09-15T12:05:00Z", RECORDING_WINDOW_AFTER_MATCH_MS, now),
    ).toBe(true);
  });
});

describe("isRecordingDismissed", () => {
  it("今日その記録を閉じていれば true", () => {
    const value = recordingDismissedValue("2026-09-15", "r1");

    expect(isRecordingDismissed(value, "r1", "2026-09-15")).toBe(true);
  });

  it("日付が変われば無効になる", () => {
    const value = recordingDismissedValue("2026-09-14", "r1");

    expect(isRecordingDismissed(value, "r1", "2026-09-15")).toBe(false);
  });

  it("別の記録には効かない", () => {
    const value = recordingDismissedValue("2026-09-15", "r1");

    expect(isRecordingDismissed(value, "r2", "2026-09-15")).toBe(false);
  });

  it("cookie が無い・壊れている場合は閉じていない扱い", () => {
    expect(isRecordingDismissed(null, "r1", "2026-09-15")).toBe(false);
    expect(isRecordingDismissed("", "r1", "2026-09-15")).toBe(false);
    expect(isRecordingDismissed("こわれた値", "r1", "2026-09-15")).toBe(false);
  });
});

describe("formatElapsedSince", () => {
  const now = new Date("2026-09-15T12:00:00Z").getTime();

  it("経過時間を分と時間で丸める", () => {
    expect(formatElapsedSince("2026-09-15T11:59:30Z", now)).toBe("たった今");
    expect(formatElapsedSince("2026-09-15T11:18:00Z", now)).toBe("42分前");
    expect(formatElapsedSince("2026-09-15T09:30:00Z", now)).toBe("2時間前");
  });
});
