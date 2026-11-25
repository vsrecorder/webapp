import { describe, expect, it } from "vitest";

import { parseDate } from "@internationalized/date";

import { OFFICIAL_EVENT_LIST_FIELDS, OfficialEventType } from "@app/types/official_event";
import {
  isOfficialEventDateKey,
  officialEventListKey,
  officialEventListUrl,
  toOfficialEventDateKey,
  toOfficialEventListItem,
} from "@app/utils/officialEventList";

// 上流(core-apiserver)が返す1件。値は実データの形に合わせている
const upstreamEvent: OfficialEventType = {
  id: 1140210,
  title: "あなやまポケカ",
  address: "山梨県韮崎市穴山町5002-2",
  venue: "次第窪公民館",
  date: "2026-09-13T00:00:00+09:00" as unknown as Date,
  started_at: "2026-09-13T08:00:00+09:00" as unknown as Date,
  ended_at: "2026-09-13T22:00:00+09:00" as unknown as Date,
  type_id: 6,
  type_name: "オーガナイザーイベント",
  league_id: 1378,
  league_title: "その他",
  regulation_title: "スタンダード",
  csp_flg: false,
  capacity: 36,
  shop_id: 20545,
  shop_name: "こあら",
  prefecture_id: 19,
  prefecture_name: "山梨県",
  environment_id: "m6",
  environment_title: "ストームエメラルダ",
  standard_regulation_id: "HIJ",
  standard_regulation_marks: "H・I・J",
};

describe("toOfficialEventListItem", () => {
  it("一覧で返すフィールドを値ごとそのまま残す", () => {
    expect(toOfficialEventListItem(upstreamEvent)).toEqual({
      id: 1140210,
      title: "あなやまポケカ",
      address: "山梨県韮崎市穴山町5002-2",
      venue: "次第窪公民館",
      date: "2026-09-13T00:00:00+09:00",
      started_at: "2026-09-13T08:00:00+09:00",
      ended_at: "2026-09-13T22:00:00+09:00",
      type_id: 6,
      shop_name: "こあら",
      prefecture_name: "山梨県",
      league_id: 1378,
      league_title: "その他",
      environment_title: "ストームエメラルダ",
    });
  });

  it("表示に使わないフィールドは落とす(1日1,400件超を運ぶため)", () => {
    const item = toOfficialEventListItem(upstreamEvent);

    for (const dropped of [
      "type_name",
      "regulation_title",
      "csp_flg",
      "capacity",
      "shop_id",
      "prefecture_id",
      "environment_id",
      "standard_regulation_id",
      "standard_regulation_marks",
    ]) {
      expect(item).not.toHaveProperty(dropped);
    }
  });

  /*
   * 一覧の消費者が使うフィールドを固定する。
   *
   * 落としたフィールドを画面が読むと、型では気づけても実行時は undefined になり
   * 表示だけが静かに欠ける。新しく必要になった項目は
   * OFFICIAL_EVENT_LIST_FIELDS に足したうえで、ここにも書き足すこと。
   */
  it("一覧の消費者が使うフィールドを網羅している", () => {
    const 記録の作成 = [
      "id",
      "title",
      "shop_name",
      "venue",
      "address",
      "date",
      "started_at",
      "ended_at",
      "type_id",
    ];
    const 記録の編集 = [
      "id",
      "title",
      "shop_name",
      "address",
      "date",
      "started_at",
      "ended_at",
      "type_id",
    ];
    const 自由形式の誘導判定 = ["title", "type_id"];
    const シティリーグ = [
      "id",
      "title",
      "date",
      "shop_name",
      "prefecture_name",
      "league_title",
      "environment_title",
    ];

    for (const field of [
      ...記録の作成,
      ...記録の編集,
      ...自由形式の誘導判定,
      ...シティリーグ,
    ]) {
      expect(OFFICIAL_EVENT_LIST_FIELDS).toContain(field);
    }
  });
});

/*
 * サーバ描画の先読み(records/create/page.tsx)とブラウザ側の SWR キーが
 * 同じ文字列になることを固定する。ずれると先読みが使われず、
 * ブラウザから同じ一覧(土日は1,400件超)を取り直すことになる。
 */
describe("toOfficialEventDateKey / officialEventListUrl", () => {
  it("月日を2桁に揃える", () => {
    expect(toOfficialEventDateKey({ year: 2026, month: 9, day: 7 })).toBe("2026-09-07");
    expect(toOfficialEventDateKey({ year: 2026, month: 12, day: 25 })).toBe("2026-12-25");
  });

  it("CalendarDate(クライアント)と parseDate(サーバ)で同じキーになる", () => {
    // どちらも { year, month, day } を持つ。同じ日を指せば同じキーでなければならない
    const fromClient = toOfficialEventDateKey(parseDate("2026-09-07"));
    const fromServer = toOfficialEventDateKey({ year: 2026, month: 9, day: 7 });

    expect(fromClient).toBe(fromServer);
    expect(officialEventListUrl(fromClient)).toBe(officialEventListUrl(fromServer));
  });

  it("SWR のキーになる取得URLを組み立てる", () => {
    expect(officialEventListUrl("2026-09-07")).toBe(
      "/api/official_events?date=2026-09-07",
    );
  });
});

/*
 * 開催日の入力欄は、年を1桁ずつ打ち直している途中でも値を渡してくる(2026 → 202 → 20 → 2)。
 * そのまま引くと上流が 400 を返していた(本番のログで "date=202-11-24" など)。
 */
describe("isOfficialEventDateKey", () => {
  it.each(["2026-11-24", "2026-02-28", "2028-02-29", "2000-01-01", "2100-12-31"])(
    "妥当な開催日(%s)は引いてよい",
    (key) => {
      expect(isOfficialEventDateKey(key)).toBe(true);
    },
  );

  it.each([
    ["年を打ち直している途中(3桁)", "202-11-24"],
    ["年を打ち直している途中(2桁)", "20-11-24"],
    ["年を打ち直している途中(1桁)", "2-11-24"],
    ["4桁でも扱わない年", "0202-11-24"],
    ["先すぎる年", "2101-01-01"],
    ["5桁の年", "20261-11-24"],
    ["実在しない日", "2026-02-30"],
    ["うるう年でない年の2月29日", "2026-02-29"],
    ["月が範囲外", "2026-13-01"],
    ["0埋めされていない月日", "2026-9-7"],
    ["空", ""],
    ["日付ではない", "today"],
    ["余計な文字が付いている", "2026-11-24T00:00:00"],
  ])("%s は引かない", (_label, key) => {
    expect(isOfficialEventDateKey(key)).toBe(false);
  });
});

describe("officialEventListKey", () => {
  it("妥当な開催日なら取得URLを返す", () => {
    expect(officialEventListKey("2026-09-07")).toBe("/api/official_events?date=2026-09-07");
  });

  it("入力途中の開催日なら null(SWR は取りに行かない)", () => {
    expect(officialEventListKey("202-09-07")).toBeNull();
  });
});
