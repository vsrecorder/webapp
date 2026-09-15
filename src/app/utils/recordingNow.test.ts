import { describe, expect, it } from "vitest";

import { MatchSummaryType } from "@app/types/match";
import { RecordType } from "@app/types/record";
import {
  RECORDING_BAR_HIDDEN_MS,
  RECORDING_WINDOW_AFTER_MATCH_MS,
  RECORDING_WINDOW_NO_MATCH_MS,
  formatElapsedDuration,
  isRecordingBarHidden,
  isRecordingDismissed,
  isWithinRecordingWindow,
  pickRecordingCandidate,
  recordingActivityOf,
  recordingBarHiddenUntil,
  recordingBarHiddenValue,
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

describe("pickRecordingCandidate", () => {
  // event_date は DATE カラムのため UTC 0時で返る。JSTの暦日として読めること
  it("今日(JST)のイベント日を持つ記録を返す", () => {
    const today = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T01:00:00Z");

    expect(pickRecordingCandidate([today], "2026-09-15")?.data.id).toBe("r1");
  });

  it("一覧の並び(event_date DESC)のまま最初に見つかった1件を返す", () => {
    const newer = record("r2", "2026-09-15T00:00:00Z", "2026-09-15T09:00:00Z");
    const older = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T01:00:00Z");

    expect(pickRecordingCandidate([newer, older], "2026-09-15")?.data.id).toBe("r2");
  });

  it("未来日の記録は候補にしない", () => {
    const future = record("r9", "2026-09-20T00:00:00Z", "2026-09-15T01:00:00Z");
    const today = record("r1", "2026-09-15T00:00:00Z", "2026-09-15T02:00:00Z");

    // 大会の予定を先に作っていると一覧の先頭は未来日になる。飛ばして今日の記録を拾う
    expect(pickRecordingCandidate([future, today], "2026-09-15")?.data.id).toBe("r1");
  });

  /*
   * 日付をまたいで記録を続けることがある(PTCGL の深夜・大会のあとの入力)。
   * 0時で消えると、いちばん記録したい場面で使えない。
   */
  it("昨日のイベント日でも候補にする", () => {
    const yesterday = record("r1", "2026-09-14T00:00:00Z", "2026-09-14T22:00:00Z");

    expect(pickRecordingCandidate([yesterday], "2026-09-15")?.data.id).toBe("r1");
  });

  it("一昨日より前は候補にしない", () => {
    const older = record("r1", "2026-09-13T00:00:00Z", "2026-09-13T01:00:00Z");

    // あとから整理しているだけなので、記録中とは見なさない
    expect(pickRecordingCandidate([older], "2026-09-15")).toBeNull();
  });

  it("月をまたいでも前日として扱う", () => {
    const lastMonth = record("r1", "2026-08-31T00:00:00Z", "2026-08-31T22:00:00Z");

    expect(pickRecordingCandidate([lastMonth], "2026-09-01")?.data.id).toBe("r1");
  });

  it("イベント日が未設定の記録は候補にしない", () => {
    const noDate = record("r1", "", "2026-09-15T01:00:00Z");

    expect(pickRecordingCandidate([noDate], "2026-09-15")).toBeNull();
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
  it("その記録を閉じていれば true", () => {
    expect(isRecordingDismissed(recordingDismissedValue("r1"), "r1")).toBe(true);
  });

  /*
   * 記録中が日付をまたぐので、閉じた印も日付では切らない
   * (切ると「終えたはずの記録が0時に戻ってくる」)。失効は cookie の寿命に任せる。
   */
  it("日付が変わっても効いたままにする", () => {
    const value = recordingDismissedValue("r1");

    expect(isRecordingDismissed(value, "r1")).toBe(true);
  });

  it("別の記録には効かない", () => {
    expect(isRecordingDismissed(recordingDismissedValue("r1"), "r2")).toBe(false);
  });

  // 入れ替わりの日に終えた人のカードが翌日いちど戻らないよう、旧形式も受ける
  it("以前の形式(YYYY-MM-DD:recordId)でも効く", () => {
    expect(isRecordingDismissed("2026-09-15:r1", "r1")).toBe(true);
    expect(isRecordingDismissed("2026-09-15:r1", "r2")).toBe(false);
  });

  it("cookie が無い・壊れている場合は閉じていない扱い", () => {
    expect(isRecordingDismissed(null, "r1")).toBe(false);
    expect(isRecordingDismissed("", "r1")).toBe(false);
    expect(isRecordingDismissed("こわれた値", "r1")).toBe(false);
  });
});

/*
 * 画面下のバーの「×」は、記録を終えずにバーだけを引っ込める。
 * 大会の合間に一度どけても、次の試合が終わる頃にはまた出ていてほしいので時間で明ける。
 */
describe("isRecordingBarHidden", () => {
  const closedAt = new Date("2026-09-15T12:00:00Z").getTime();
  const value = recordingBarHiddenValue("r1", closedAt);

  it("閉じた直後は引っ込めたまま", () => {
    expect(isRecordingBarHidden(value, "r1", closedAt + 1000)).toBe(true);
  });

  it("10分経てばまた出す", () => {
    expect(isRecordingBarHidden(value, "r1", closedAt + RECORDING_BAR_HIDDEN_MS - 1)).toBe(
      true,
    );
    expect(isRecordingBarHidden(value, "r1", closedAt + RECORDING_BAR_HIDDEN_MS)).toBe(
      false,
    );
  });

  it("別の記録には効かない", () => {
    expect(isRecordingBarHidden(value, "r2", closedAt + 1000)).toBe(false);
  });

  it("値が無い・壊れていれば引っ込めない", () => {
    expect(isRecordingBarHidden(null, "r1", closedAt)).toBe(false);
    expect(isRecordingBarHidden("", "r1", closedAt)).toBe(false);
    expect(isRecordingBarHidden("r1", "r1", closedAt)).toBe(false);
    expect(isRecordingBarHidden("r1:こわれた値", "r1", closedAt)).toBe(false);
  });

  it("明ける時刻を返す(呼び出し側がタイマーを張れる)", () => {
    expect(recordingBarHiddenUntil(value, "r1")).toBe(closedAt + RECORDING_BAR_HIDDEN_MS);
    expect(recordingBarHiddenUntil(value, "r2")).toBeNull();
  });
});

describe("formatElapsedDuration", () => {
  const now = new Date("2026-09-15T12:00:00Z").getTime();

  it("経過時間を分と時間で丸める", () => {
    expect(formatElapsedDuration("2026-09-15T11:18:00Z", now)).toBe("42分");
    expect(formatElapsedDuration("2026-09-15T09:30:00Z", now)).toBe("2時間");
  });

  // 「0分経過」「たった今経過」は据わりが悪いので、下は1分で止める
  it("1分未満も1分として出す", () => {
    expect(formatElapsedDuration("2026-09-15T11:59:30Z", now)).toBe("1分");
    expect(formatElapsedDuration("2026-09-15T12:00:00Z", now)).toBe("1分");
  });
});
