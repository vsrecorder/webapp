import { describe, expect, it } from "vitest";

import {
  cleanOfficialEventTitle,
  defaultRegulationIdForOfficialEvent,
  defaultRegulationIdForRecordForm,
  getEventIconAlt,
  getEventIconUrl,
  isEitherDayEntryEvent,
  isHiddenFromOfficialEventSelect,
  isJudgeStaffEvent,
  isOrganizerStaffEvent,
  sortOfficialEventsForSelect,
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

describe("30th CELEBRATION スペシャルメダルグランプリ", () => {
  const event = {
    type_id: 4,
    title: "【10_11月開催】30th CELEBRATION スペシャルメダルグランプリ",
  };

  it("タイトルから先頭の【】の注記を外す", () => {
    expect(cleanOfficialEventTitle(event.title)).toBe(
      "30th CELEBRATION スペシャルメダルグランプリ",
    );
  });

  it("専用のアイコンを使う(整形後のタイトルでも同じ)", () => {
    for (const title of [event.title, cleanOfficialEventTitle(event.title)]) {
      expect(getEventIconUrl({ ...event, title })).toMatch(
        /\/30th-celebration-special-medal-grand-prix\.png$/,
      );
      expect(getEventIconAlt({ ...event, title })).toBe(
        "30th CELEBRATION スペシャルメダルグランプリ",
      );
    }
  });
});

describe("isJudgeStaffEvent", () => {
  it("大型大会として載るジャッジの募集・稼働・研修は対象外とみなす", () => {
    for (const title of [
      "チャンピオンズリーグ2027千葉　ジャッジ稼働",
      "「チャンピオンズリーグ2027 千葉」ボランティアジャッジ募集",
      "ポケモンカードゲーム スクランブルバトル 香川（ジャッジ応募）",
      "8月15日（土）開催　ポケモンカードゲーム　ジャッジセミナーinスクランブルバトル大阪【初級編】",
      "2026年度ジャッジ資格試験　受験応募",
    ]) {
      expect(isJudgeStaffEvent({ title, type_id: 1 })).toBe(true);
    }
  });

  it("大型大会以外はジャッジを含んでも対象外にしない", () => {
    expect(isJudgeStaffEvent({ title: "ジャッジとバトル！", type_id: 6 })).toBe(false);
    expect(
      isJudgeStaffEvent({ title: "公認ジャッジ有！シティリーグ練習会！", type_id: 6 }),
    ).toBe(false);
    // シティリーグ・トレーナーズリーグ・ジムイベント・その他も外さない
    for (const type_id of [2, 3, 4, 7]) {
      expect(isJudgeStaffEvent({ title: "ジャッジと遊ぼう！！", type_id })).toBe(false);
    }
  });

  it("ジャッジを含まない大会はそのまま", () => {
    expect(
      isJudgeStaffEvent({ title: "チャンピオンズリーグ2027 千葉 マスターリーグ", type_id: 1 }),
    ).toBe(false);
  });
});

describe("isEitherDayEntryEvent", () => {
  it("CL のシニア・ジュニアの「どちらの日でも可」の応募枠を判定する(シーズンごとの表記)", () => {
    for (const title of [
      "チャンピオンズリーグ2027 横浜 シニアリーグ 1日目大会or2日目大会どちらでも可",
      "チャンピオンズリーグ2027 千葉 ジュニアリーグ 1日目大会or2日目大会どちらでも可",
      "チャンピオンズリーグ2026 大阪 シニアリーグ 1日目大会もしくは2日目大会いずれか",
      "【追加募集】チャンピオンズリーグ2025 東京 ジュニアリーグ 1日目大会もしくは2日目大会いずれか",
    ]) {
      expect(isEitherDayEntryEvent({ title, type_id: 1 })).toBe(true);
    }
  });

  it("1日目・2日目の大会そのものや予選・本戦は外さない", () => {
    for (const title of [
      "チャンピオンズリーグ2027 横浜 シニアリーグ 1日目大会",
      "チャンピオンズリーグ2027 横浜 ジュニアリーグ 2日目大会",
      "チャンピオンズリーグ2025 東京 シニアリーグ 1日目大会【2024年9月22日（日）開催】",
      "チャンピオンズリーグ2027 横浜 マスターリーグ 1日目予選",
      "チャンピオンズリーグ2027 横浜 マスターリーグ 本戦",
    ]) {
      expect(isEitherDayEntryEvent({ title, type_id: 1 })).toBe(false);
    }
  });

  it("大型大会以外は判定しない", () => {
    const title = "1日目大会or2日目大会どちらでも可";

    for (const type_id of [2, 3, 4, 6, 7]) {
      expect(isEitherDayEntryEvent({ title, type_id })).toBe(false);
    }
  });
});

describe("isOrganizerStaffEvent", () => {
  it("大型大会として載るオーガナイザーの研修・資格試験・活動調査は対象外とみなす", () => {
    for (const title of [
      "イベントオーガナイザーオンライン研修",
      "【2025年度公式資格試験】オーガナイザー研修（3月7日）",
      "ポケモンカードゲーム 25年度公式資格試験　イベントオーガナイザー研修",
      "ポケモンカードゲーム　イベントオーガナイザー活動調査",
      "2026年度イベントオーガナイザー資格試験　受験応募",
    ]) {
      expect(isOrganizerStaffEvent({ title, type_id: 1 })).toBe(true);
    }
  });

  it("オーガナイザーイベントは外さない", () => {
    for (const title of ["オーガナイザーイベント！ (特殊構築ルール戦)", "MINT横浜オーガナイザーイベント (干支杯)"]) {
      expect(isOrganizerStaffEvent({ title, type_id: 6 })).toBe(false);
    }
  });

  it("オーガナイザーを含まない大会はそのまま", () => {
    expect(
      isOrganizerStaffEvent({ title: "チャンピオンズリーグ2027 千葉 マスターリーグ", type_id: 1 }),
    ).toBe(false);
  });
});

describe("isHiddenFromOfficialEventSelect", () => {
  it("ジャッジ・オーガナイザーの募集や研修と「どちらの日でも可」の応募枠を外し、大会は残す", () => {
    expect(
      isHiddenFromOfficialEventSelect({ title: "チャンピオンズリーグ2027千葉　ジャッジ稼働", type_id: 1 }),
    ).toBe(true);
    expect(
      isHiddenFromOfficialEventSelect({
        title: "ポケモンカードゲーム 25年度公式資格試験　イベントオーガナイザー研修",
        type_id: 1,
      }),
    ).toBe(true);
    expect(
      isHiddenFromOfficialEventSelect({
        title: "チャンピオンズリーグ2027 千葉 シニアリーグ 1日目大会or2日目大会どちらでも可",
        type_id: 1,
      }),
    ).toBe(true);
    expect(
      isHiddenFromOfficialEventSelect({
        title: "チャンピオンズリーグ2027 千葉 シニアリーグ 1日目大会",
        type_id: 1,
      }),
    ).toBe(false);
  });
});

describe("sortOfficialEventsForSelect", () => {
  // API は開催時刻順で返す。id はその順に振ってある
  const events = [
    { id: 1, type_id: 4, title: "ジムバトル", league_id: 1411, league_title: "その他" }, // ジムバトル 10:00
    { id: 2, type_id: 3, title: "", league_id: 1417, league_title: "マスター" }, // トレリ マスター 10:00
    { id: 3, type_id: 3, title: "", league_id: 1413, league_title: "ジュニア" }, // トレリ ジュニア 10:00
    { id: 4, type_id: 3, title: "", league_id: 1410, league_title: "オープン" }, // トレリ オープン 11:00
    { id: 5, type_id: 2, title: "", league_id: 1309, league_title: "オープン" }, // シティ オープン 12:00
    { id: 6, type_id: 3, title: "", league_id: 1414, league_title: "シニア" }, // トレリ シニア 12:00
    { id: 7, type_id: 3, title: "", league_id: 1410, league_title: "オープン" }, // トレリ オープン 13:00
  ];

  it("種別 → 区分(オープン → マスター → シニア → ジュニア)の順に並べ、同じ種別・区分の中は元の順(開催時刻順)を保つ", () => {
    expect(sortOfficialEventsForSelect(events).map((e) => e.id)).toEqual([
      5, 4, 7, 2, 6, 3, 1,
    ]);
  });

  it("元の配列(SWR のキャッシュ)は書き換えない", () => {
    const before = events.map((e) => e.id);
    sortOfficialEventsForSelect(events);
    expect(events.map((e) => e.id)).toEqual(before);
  });

  it("区分の無いもの(その他・未設定)は同じ種別の末尾に置く", () => {
    const sorted = sortOfficialEventsForSelect([
      { id: 1, type_id: 7, title: "", league_id: 1500, league_title: "その他" },
      { id: 2, type_id: 7, title: "", league_id: 1501 },
      { id: 3, type_id: 7, title: "", league_id: 1502, league_title: "ジュニア" },
      { id: 4, type_id: 7, title: "", league_id: 1503, league_title: "オープン" },
    ]);
    expect(sorted.map((e) => e.id)).toEqual([4, 3, 1, 2]);
  });

  it("同じ区分の中は league_id 順に並べ、league_id が無いものはその末尾に置く", () => {
    const sorted = sortOfficialEventsForSelect([
      { id: 1, type_id: 1, title: "", league_id: 0, league_title: "マスター" },
      { id: 2, type_id: 1, title: "", league_title: "マスター" },
      { id: 3, type_id: 1, title: "", league_id: 1600, league_title: "マスター" },
      { id: 4, type_id: 1, title: "", league_id: 1500, league_title: "マスター" },
      { id: 5, type_id: 1, title: "", league_id: 1600, league_title: "シニア" },
    ]);
    expect(sorted.map((e) => e.id)).toEqual([4, 3, 1, 2, 5]);
  });

  it("種別 4 の中ではジムバトルを先頭に置き、トレーナーズリーグのすぐ下に来る", () => {
    // 実データでは、ジムバトル(1411)より league_id の小さいイベントが種別 4 に並ぶ
    const sorted = sortOfficialEventsForSelect([
      {
        id: 1,
        type_id: 4,
        title: "【東京】ポケモンセンター　フリーバトル",
        league_id: 38,
        league_title: "その他",
      },
      {
        id: 2,
        type_id: 4,
        title: "【10_11月開催】30th CELEBRATION スペシャルメダルグランプリ",
        league_id: 1346,
        league_title: "その他",
      },
      {
        id: 3,
        type_id: 4,
        title: "【店舗】ポケモンカードジム　ジムバトル／小学生以下",
        league_id: 1412,
        league_title: "その他",
      },
      {
        id: 4,
        type_id: 4,
        title: "【店舗】ポケモンカードジム　ジムバトル",
        league_id: 1411,
        league_title: "その他",
      },
      {
        id: 5,
        type_id: 3,
        title: "【26/11】ポケモンカードジム　トレーナーズリーグ（ジュニアリーグ）",
        league_id: 1413,
        league_title: "ジュニア",
      },
      {
        id: 6,
        type_id: 6,
        title: "ジムバトル交流会",
        league_id: 1379,
        league_title: "その他",
      },
    ]);
    // 公認自主イベント(種別 6)の「ジムバトル交流会」は種別の順のまま
    expect(sorted.map((e) => e.id)).toEqual([5, 4, 3, 1, 2, 6]);
  });
});
