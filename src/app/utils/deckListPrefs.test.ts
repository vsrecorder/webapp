import { describe, expect, it } from "vitest";

import { parseDeckListView, parseDecksTab, readCookieValue } from "@app/utils/deckListPrefs";

describe("readCookieValue", () => {
  it("名前で値を取り出す(前後の空白・複数の cookie・URL エンコード)", () => {
    expect(readCookieValue("a=1; deckListView=list; b=2", "deckListView")).toBe("list");
    expect(readCookieValue("deckListView=%E3%81%82", "deckListView")).toBe("あ");
    expect(readCookieValue("x=a=b", "x")).toBe("a=b");
  });

  it("無ければ null。名前の前方一致では拾わない", () => {
    expect(readCookieValue("", "deckListView")).toBeNull();
    expect(readCookieValue(null, "deckListView")).toBeNull();
    expect(readCookieValue("deckListViewX=list", "deckListView")).toBeNull();
    expect(readCookieValue("xdeckListView=list", "deckListView")).toBeNull();
  });

  it("壊れたエンコードは null(例外にしない)", () => {
    expect(readCookieValue("v=%E3%81", "v")).toBeNull();
  });
});

describe("parseDeckListView / parseDecksTab", () => {
  it("既知の値だけを通す", () => {
    expect(parseDeckListView("list")).toBe("list");
    expect(parseDeckListView("gallery")).toBe("gallery");
    expect(parseDeckListView("grid")).toBeNull();
    expect(parseDeckListView(undefined)).toBeNull();
    expect(parseDecksTab("archived")).toBe("archived");
    expect(parseDecksTab("inuse")).toBe("inuse");
    expect(parseDecksTab("")).toBeNull();
  });
});
