import { describe, expect, it } from "vitest";

import { resolveDecksInitialTab } from "@app/utils/decksSelectedTab";

describe("resolveDecksInitialTab", () => {
  it("再開フラグが立っていれば保存値に関わらずアーカイブ済み", () => {
    expect(resolveDecksInitialTab({ reopenArchivedFlag: "1", savedTab: "inuse" })).toBe("archived");
    expect(resolveDecksInitialTab({ reopenArchivedFlag: "1", savedTab: null })).toBe("archived");
  });

  it("再開フラグが無ければ保存済みのタブ", () => {
    expect(resolveDecksInitialTab({ reopenArchivedFlag: null, savedTab: "archived" })).toBe("archived");
    expect(resolveDecksInitialTab({ reopenArchivedFlag: "0", savedTab: "archived" })).toBe("archived");
    expect(resolveDecksInitialTab({ reopenArchivedFlag: null, savedTab: "inuse" })).toBe("inuse");
  });

  it("どちらも無い・不正な値なら利用中", () => {
    expect(resolveDecksInitialTab({ reopenArchivedFlag: null, savedTab: null })).toBe("inuse");
    expect(resolveDecksInitialTab({ reopenArchivedFlag: "x", savedTab: "unknown" })).toBe("inuse");
  });
});
