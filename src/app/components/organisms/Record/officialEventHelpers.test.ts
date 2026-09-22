import { describe, expect, it } from "vitest";

import {
  cleanOfficialEventTitle,
  defaultRegulationIdForOfficialEvent,
  defaultRegulationIdForRecordForm,
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

describe("defaultRegulationIdForRecordForm", () => {
  const extraBattleDay = { title: "エクストラバトルの日" };

  it("公式イベントのタブではイベントの既定値を使う", () => {
    expect(defaultRegulationIdForRecordForm(true, extraBattleDay)).toBe(
      REGULATION_ID_EXTRA,
    );
  });

  it("公式イベント以外のタブではスタンダードへ戻す", () => {
    // エクストラバトルの日を選んだあとに自由形式・Tonamel へ切り替えても、
    // その記録はイベントに紐づかないのでエクストラを持ち越さない
    expect(defaultRegulationIdForRecordForm(false, extraBattleDay)).toBe(
      DEFAULT_REGULATION_ID,
    );
  });

  it("イベント未選択はどちらのタブでもスタンダード", () => {
    expect(defaultRegulationIdForRecordForm(true, null)).toBe(DEFAULT_REGULATION_ID);
    expect(defaultRegulationIdForRecordForm(false, null)).toBe(DEFAULT_REGULATION_ID);
  });
});
