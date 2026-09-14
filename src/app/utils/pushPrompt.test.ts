// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeRecordCreatedTrigger,
  discardRecordCreatedTrigger,
  isPushPromptDismissedAt,
  markRecordCreatedForPushPrompt,
  readRecordCreatedTrigger,
} from "@app/utils/pushPrompt";

const TRIGGER_KEY = "vsrec:push-prompt:record-created";

describe("記録作成のトリガー", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // モジュールが覚えている答えを捨てる(次の読み取りで sessionStorage を見直す)
    discardRecordCreatedTrigger();
    sessionStorage.clear();
  });

  it("読んでも sessionStorage の目印は消えない", () => {
    markRecordCreatedForPushPrompt();

    expect(readRecordCreatedTrigger()).toBe(true);
    // 描画のたびに呼ばれる読み取りなので、ここで消してはいけない
    // (React が描画を捨てると、表示されないまま目印だけ失われる)
    expect(sessionStorage.getItem(TRIGGER_KEY)).not.toBeNull();
    expect(readRecordCreatedTrigger()).toBe(true);
    expect(sessionStorage.getItem(TRIGGER_KEY)).not.toBeNull();
  });

  it("consume すると目印は消えるが、この文書の判定は残る", () => {
    markRecordCreatedForPushPrompt();
    expect(readRecordCreatedTrigger()).toBe(true);

    consumeRecordCreatedTrigger();

    // リロードすれば出ない。ただし今表示中のプロンプトは消さない
    expect(sessionStorage.getItem(TRIGGER_KEY)).toBeNull();
    expect(readRecordCreatedTrigger()).toBe(true);
  });

  it("目印が無ければ false", () => {
    expect(readRecordCreatedTrigger()).toBe(false);
  });

  it("discard すると目印も判定も消える", () => {
    markRecordCreatedForPushPrompt();
    expect(readRecordCreatedTrigger()).toBe(true);

    discardRecordCreatedTrigger();

    expect(sessionStorage.getItem(TRIGGER_KEY)).toBeNull();
    expect(readRecordCreatedTrigger()).toBe(false);
  });
});

describe("isPushPromptDismissedAt", () => {
  it("14日以内なら再表示しない", () => {
    expect(isPushPromptDismissedAt(String(Date.now()))).toBe(true);
  });

  it("14日を過ぎていれば再表示してよい", () => {
    const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
    expect(isPushPromptDismissedAt(String(fifteenDaysAgo))).toBe(false);
  });

  it("記録が無ければ再表示してよい", () => {
    expect(isPushPromptDismissedAt(null)).toBe(false);
  });
});
