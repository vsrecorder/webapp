import { describe, expect, it } from "vitest";

import {
  DEFAULT_RECORD_CREATE_TAB,
  parseRecordCreateTab,
  resolveRecordCreateTab,
} from "@app/utils/recordCreatePrefs";

describe("parseRecordCreateTab", () => {
  it("既知のタブだけを通す", () => {
    expect(parseRecordCreateTab("official")).toBe("official");
    expect(parseRecordCreateTab("tonamel")).toBe("tonamel");
    expect(parseRecordCreateTab("unofficial")).toBe("unofficial");
  });

  it("知らない値・未設定は null(cookie も URL も書き換えられるため)", () => {
    expect(parseRecordCreateTab("../etc")).toBeNull();
    expect(parseRecordCreateTab("")).toBeNull();
    expect(parseRecordCreateTab(null)).toBeNull();
    expect(parseRecordCreateTab(undefined)).toBeNull();
  });
});

describe("resolveRecordCreateTab", () => {
  it("公式イベントを名指しした遷移は、保存済みのタブより優先する", () => {
    expect(
      resolveRecordCreateTab({
        officialEventId: "12345",
        eventType: "unofficial",
        savedTab: "tonamel",
      }),
    ).toBe("official");
  });

  it("URL の event_type は保存済みのタブより優先する", () => {
    expect(
      resolveRecordCreateTab({
        officialEventId: undefined,
        eventType: "tonamel",
        savedTab: "unofficial",
      }),
    ).toBe("tonamel");
  });

  it("指定が無ければ保存済みのタブを復元する", () => {
    expect(
      resolveRecordCreateTab({
        officialEventId: undefined,
        eventType: undefined,
        savedTab: "unofficial",
      }),
    ).toBe("unofficial");
  });

  it("どちらも無ければ公式イベント", () => {
    expect(
      resolveRecordCreateTab({
        officialEventId: undefined,
        eventType: undefined,
        savedTab: null,
      }),
    ).toBe(DEFAULT_RECORD_CREATE_TAB);
  });
});
