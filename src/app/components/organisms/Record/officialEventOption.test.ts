import { describe, expect, it } from "vitest";

import { toOfficialEventOption } from "@app/components/organisms/Record/officialEventOption";
import { RecordCreateOfficialEventType } from "@app/types/official_event";

// 一覧が返す1件。個々のテストで見たいフィールドだけ上書きする
function makeEvent(
  overrides: Partial<RecordCreateOfficialEventType> = {},
): RecordCreateOfficialEventType {
  return {
    id: 1,
    title: "【ポケモンカードジム】ポケモンカードゲーム　ジムバトル",
    address: "東京都町田市原町田1-1-1",
    venue: "",
    date: new Date("2026-09-21T00:00:00Z"),
    // JST の 13:00 〜 16:00
    started_at: new Date("2026-09-21T04:00:00Z"),
    ended_at: new Date("2026-09-21T07:00:00Z"),
    type_id: 4,
    shop_name: "カードショップ町田店",
    ...overrides,
  };
}

describe("toOfficialEventOption の絞り込み文字列", () => {
  it("住所・会場名・開催時刻で引ける", () => {
    const option = toOfficialEventOption(makeEvent());

    // プレースホルダの「例）町田市」は住所での検索を指している
    expect(option.label).toContain("町田市");
    expect(option.label).toContain("カードショップ町田店");
    expect(option.label).toContain("13:00 ~ 16:00");
  });

  it("タイトルはかな入力のままでも引ける", () => {
    const option = toOfficialEventOption(
      makeEvent({ title: "【〇〇店】ポケモンカードゲーム　シティリーグ", type_id: 2 }),
    );

    // 店舗名の接頭辞は cleanOfficialEventTitle が落とす
    expect(option.title).toBe("シティリーグ");
    expect(option.label).toContain("してぃりーぐ");
  });

  it("トレーナーズリーグは通称でも引ける", () => {
    const option = toOfficialEventOption(
      makeEvent({ title: "ポケモンカードゲーム　トレーナーズリーグ", type_id: 3 }),
    );

    expect(option.label).toContain("とれり");
    expect(option.label).toContain("トレリ");
  });
});

describe("toOfficialEventOption の表示", () => {
  it("店舗名が無いイベントは会場名を主催者として出す", () => {
    const option = toOfficialEventOption(
      makeEvent({ shop_name: "", venue: "町田市民ホール" }),
    );

    expect(option.shop_name).toBe("町田市民ホール");
    expect(option.label).toContain("町田市民ホール");
  });

  it("開始・終了が未設定(JSTの0時)なら時刻を出さない", () => {
    const option = toOfficialEventOption(
      makeEvent({
        started_at: new Date("2026-09-20T15:00:00Z"),
        ended_at: new Date("2026-09-20T15:00:00Z"),
      }),
    );

    expect(option.event_time).toBe("");
    expect(option.event_datetime).toBe("2026年9月21日(月) ");
  });

  it("種別に応じたアイコンと代替テキストを持つ", () => {
    const gym = toOfficialEventOption(makeEvent());
    expect(gym.image_src).toMatch(/gym\.png$/);
    expect(gym.image_alt).toBe("ジムバトル");

    const city = toOfficialEventOption(
      makeEvent({ title: "【〇〇店】ポケモンカードゲーム　シティリーグ", type_id: 2 }),
    );
    expect(city.image_src).toMatch(/city\.png$/);
    expect(city.image_alt).toBe("シティリーグ");

    // 判定できない種別はポケモンカードゲームのアイコンへ倒す
    const other = toOfficialEventOption(makeEvent({ title: "なにかの催し", type_id: 99 }));
    expect(other.image_src).toMatch(/pokemon_card_game\.png$/);
    expect(other.image_alt).toBe("ポケモンカードゲーム");
  });
});
