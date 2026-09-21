import { describe, expect, it } from "vitest";

import {
  cleanOfficialEventTitle,
  defaultRegulationIdForOfficialEvent,
} from "@app/components/organisms/Record/officialEventHelpers";
import { DEFAULT_REGULATION_ID, REGULATION_ID_EXTRA } from "@app/types/regulation";

describe("defaultRegulationIdForOfficialEvent", () => {
  it("エクストラバトルの日はエクストラを既定にする", () => {
    const title = "【ポケモンカードジム】エクストラバトルの日";

    expect(defaultRegulationIdForOfficialEvent({ title })).toBe(REGULATION_ID_EXTRA);
    // 選択肢が持つのは整形後のタイトルなので、そちらでも同じ判定になること
    expect(
      defaultRegulationIdForOfficialEvent({ title: cleanOfficialEventTitle(title) }),
    ).toBe(REGULATION_ID_EXTRA);
  });

  it("他の公式イベントと未選択はスタンダードのまま", () => {
    expect(
      defaultRegulationIdForOfficialEvent({
        title: "【ポケモンカードジム】ポケモンカードゲーム　ジムバトル",
      }),
    ).toBe(DEFAULT_REGULATION_ID);
    expect(defaultRegulationIdForOfficialEvent(null)).toBe(DEFAULT_REGULATION_ID);
  });
});
