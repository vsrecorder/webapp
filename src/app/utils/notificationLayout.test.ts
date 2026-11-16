import { describe, expect, it } from "vitest";

import { takeNotificationOpenSnapshot, usesUnreadLayout } from "./notificationLayout";

const n = (id: string, is_read: boolean) => ({ id, is_read });

describe("takeNotificationOpenSnapshot", () => {
  it("開いた時点で未読の id を控える", () => {
    const s = takeNotificationOpenSnapshot([n("a", false), n("b", true), n("c", false)]);
    expect([...s.unreadIds].sort()).toEqual(["a", "c"]);
  });

  it("全部既読なら控えは空", () => {
    expect(takeNotificationOpenSnapshot([n("a", true)]).unreadIds.size).toBe(0);
  });
});

describe("usesUnreadLayout", () => {
  it("閉じている間は今の既読状態どおり", () => {
    expect(usesUnreadLayout(n("a", false), null)).toBe(true);
    expect(usesUnreadLayout(n("a", true), null)).toBe(false);
  });

  it("開いている間に既読になった行は未読の配置のまま", () => {
    const s = takeNotificationOpenSnapshot([n("a", false), n("b", true)]);
    expect(usesUnreadLayout(n("a", true), s)).toBe(true);
  });

  it("開いた時点で既読だった行は既読の配置", () => {
    const s = takeNotificationOpenSnapshot([n("a", false), n("b", true)]);
    expect(usesUnreadLayout(n("b", true), s)).toBe(false);
  });

  it("開いている間に届いた行は今の既読状態どおり", () => {
    const s = takeNotificationOpenSnapshot([n("a", false)]);
    expect(usesUnreadLayout(n("new", true), s)).toBe(false);
    expect(usesUnreadLayout(n("new", false), s)).toBe(true);
  });
});
