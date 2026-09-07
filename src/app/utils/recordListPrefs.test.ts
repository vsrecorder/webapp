import { describe, expect, it } from "vitest";

import { parseRecordsTab, recordsTabToEventType } from "@app/utils/recordListPrefs";

describe("parseRecordsTab", () => {
  it("既知の値だけを通す", () => {
    expect(parseRecordsTab("all")).toBe("all");
    expect(parseRecordsTab("official")).toBe("official");
    expect(parseRecordsTab("tonamel")).toBe("tonamel");
    expect(parseRecordsTab("unofficial")).toBe("unofficial");
    expect(parseRecordsTab("archived")).toBeNull();
    expect(parseRecordsTab("")).toBeNull();
    expect(parseRecordsTab(undefined)).toBeNull();
    expect(parseRecordsTab(null)).toBeNull();
  });
});

describe("recordsTabToEventType", () => {
  it("「すべて」は絞り込みなし、それ以外はタブ名そのまま", () => {
    expect(recordsTabToEventType("all")).toBe("");
    expect(recordsTabToEventType("official")).toBe("official");
    expect(recordsTabToEventType("tonamel")).toBe("tonamel");
  });
});
