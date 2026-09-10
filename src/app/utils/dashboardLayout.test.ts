import { describe, expect, it } from "vitest";

import {
  applyOrderMigrations,
  DASHBOARD_ORDER_VERSION,
  DEFAULT_DASHBOARD_LAYOUT,
  initialSectionStateFromLayout,
  isDashboardBlockId,
  mergeIntoStoredOrder,
  sectionIdOfBlock,
  parseDashboardLayout,
  serializeDashboardLayout,
  splitDashboardLayout,
} from "@app/utils/dashboardLayout";

describe("parseDashboardLayout", () => {
  it("カンマ区切りの並びをそのままの順序で返す", () => {
    expect(parseDashboardLayout("profile,streak,calendar")).toEqual([
      "profile",
      "streak",
      "calendar",
    ]);
  });

  it("前後の空白を落とす", () => {
    expect(parseDashboardLayout(" profile , streak ")).toEqual(["profile", "streak"]);
  });

  // cookie は誰でも書き換えられるので、知らないIDが混じっても壊れないこと
  it("未知のIDを捨てる", () => {
    expect(parseDashboardLayout("profile,unknown_panel,streak")).toEqual([
      "profile",
      "streak",
    ]);
  });

  // 同じブロックを二度描くと骨格が実物より高くなる
  it("重複を最初の1つだけ残す", () => {
    expect(parseDashboardLayout("streak,profile,streak")).toEqual(["streak", "profile"]);
  });

  it("空・未設定・既知のIDが1つも無い場合は null", () => {
    expect(parseDashboardLayout("")).toBeNull();
    expect(parseDashboardLayout(null)).toBeNull();
    expect(parseDashboardLayout(undefined)).toBeNull();
    expect(parseDashboardLayout("unknown_panel,,")).toBeNull();
  });
});

describe("serializeDashboardLayout", () => {
  it("書き出した値をそのまま読み戻せる", () => {
    const layout = ["profile", "first_record_cta", "streak", "recent_records"] as const;

    expect(parseDashboardLayout(serializeDashboardLayout(layout))).toEqual([...layout]);
  });
});

describe("splitDashboardLayout", () => {
  // 画面は「pinned / 多段組のセクション / trailing」の3つのまとまりに分かれるが、
  // cookie は1本の並びしか持たない。どこへ入るかはIDで決まる。
  it("IDごとに pinned・セクション・trailing へ振り分ける", () => {
    const { pinned, sections, trailing } = splitDashboardLayout([
      "profile",
      "first_record_cta",
      "env_window",
      "streak",
      "calendar",
      "recent_records",
    ]);

    expect(pinned).toEqual(["profile", "first_record_cta", "env_window"]);
    expect(sections).toEqual(["streak", "calendar"]);
    expect(trailing).toEqual(["recent_records"]);
  });

  it("セクションは cookie に入っていた順序を保つ", () => {
    const { sections } = splitDashboardLayout(["calendar", "badges", "streak"]);

    expect(sections).toEqual(["calendar", "badges", "streak"]);
  });

  it("該当が無いまとまりは空になる", () => {
    const { pinned, sections, trailing } = splitDashboardLayout(["streak"]);

    expect(pinned).toEqual([]);
    expect(sections).toEqual(["streak"]);
    expect(trailing).toEqual([]);
  });
});

describe("isDashboardBlockId", () => {
  it("骨格を持つIDだけを通す", () => {
    expect(isDashboardBlockId("streak")).toBe(true);
    expect(isDashboardBlockId("environment_meta_window")).toBe(true);
    expect(isDashboardBlockId("designation_linked")).toBe(true);
    expect(isDashboardBlockId("cityleague_off_season")).toBe(true);
    expect(isDashboardBlockId("nope")).toBe(false);
  });
});

// 既定の並びは cookie を持たない初回訪問で使われる。壊れた並びを配ってしまわないよう見張る
describe("DEFAULT_DASHBOARD_LAYOUT", () => {
  it("既知のIDだけで組まれている", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.every(isDashboardBlockId)).toBe(true);
  });

  it("プロフィールカードが先頭で、最近の記録が末尾", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT[0]).toBe("profile");
    expect(DEFAULT_DASHBOARD_LAYOUT[DEFAULT_DASHBOARD_LAYOUT.length - 1]).toBe(
      "recent_records",
    );
  });

  // 出方がサーバの取得結果で決まる節は「出ない側」に倒してある(骨格が実物より高いと
  // 差し替わりで下がせり上がる)
  it("記録件数で出る節は含まない", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT).not.toContain("first_record_cta");
    expect(DEFAULT_DASHBOARD_LAYOUT).not.toContain("env_window");
  });

  // 中身が2種類ある節は、背の低い方を既定にする
  it("称号は未連携の側、対戦環境データは従来パネルの側を使う", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT).toContain("designation");
    expect(DEFAULT_DASHBOARD_LAYOUT).not.toContain("designation_linked");
    expect(DEFAULT_DASHBOARD_LAYOUT).toContain("environment_meta");
    expect(DEFAULT_DASHBOARD_LAYOUT).not.toContain("environment_meta_window");
  });

  // シティリーグの節は開催期間によらず常に出る。骨格は背の低い期間外の側
  it("シティリーグは開催期間外の側を使う", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT).toContain("cityleague_off_season");
    expect(DEFAULT_DASHBOARD_LAYOUT).not.toContain("cityleague");
  });

  // ストリークの直下がシティリーグ(Dashboard.tsx が sections を積む順と揃える)
  it("シティリーグはストリークの直後に置く", () => {
    const streak = DEFAULT_DASHBOARD_LAYOUT.indexOf("streak");

    expect(DEFAULT_DASHBOARD_LAYOUT[streak + 1]).toBe("cityleague_off_season");
  });
});

describe("mergeIntoStoredOrder", () => {
  // 節が増える前に保存された並び。ここに無い節をどこへ入れるかが問題になる
  const defaultOrder = [
    "onboarding_badges",
    "streak",
    "cityleague",
    "my_gyms",
    "designation",
  ];

  it("保存済みの並びをそのまま保つ", () => {
    expect(mergeIntoStoredOrder(defaultOrder, defaultOrder)).toEqual(defaultOrder);
  });

  // 本題。末尾に足すと、既存ユーザーにだけホーム・表示設定の最下部に現れてしまう
  it("保存済みの並びに無い節を既定の位置へ差し込む", () => {
    const stored = ["onboarding_badges", "streak", "my_gyms", "designation"];

    expect(mergeIntoStoredOrder(stored, defaultOrder)).toEqual([
      "onboarding_badges",
      "streak",
      "cityleague",
      "my_gyms",
      "designation",
    ]);
  });

  // ユーザーが自分で並べ替えた順序は崩さず、直前に来る節の後ろへ入れる
  it("並べ替え済みでも既定で直前の節の後ろに入る", () => {
    const stored = ["designation", "my_gyms", "streak", "onboarding_badges"];

    expect(mergeIntoStoredOrder(stored, defaultOrder)).toEqual([
      "designation",
      "my_gyms",
      "streak",
      "cityleague",
      "onboarding_badges",
    ]);
  });

  it("既定で先頭の節が保存済みに無ければ先頭へ入れる", () => {
    expect(mergeIntoStoredOrder(["streak"], defaultOrder)).toEqual([
      "onboarding_badges",
      "streak",
      "cityleague",
      "my_gyms",
      "designation",
    ]);
  });

  it("連続して欠けている節も既定の順のまま並ぶ", () => {
    expect(mergeIntoStoredOrder(["onboarding_badges"], defaultOrder)).toEqual(defaultOrder);
  });

  it("未知のIDと重複は落とす", () => {
    const stored = ["nope", "streak", "streak", "onboarding_badges"];

    expect(mergeIntoStoredOrder(stored, defaultOrder)).toEqual([
      "streak",
      "cityleague",
      "my_gyms",
      "designation",
      "onboarding_badges",
    ]);
  });

  it("保存済みが空なら既定の並びになる", () => {
    expect(mergeIntoStoredOrder([], defaultOrder)).toEqual(defaultOrder);
  });

  /*
   * 実際に起きた不具合の再現。
   *
   * 「本日のシティリーグ結果」は開催日にしか出ていなかったため、既存ユーザーの保存済みの
   * 並び(localStorage)には入っていない。常に出すようにしたあと末尾に足していたので、
   * ホームでも表示設定でも一番下に現れていた。ストリークの直後に入ること。
   */
  it("常時表示にしたシティリーグがストリークの直後に入る", () => {
    const real = splitDashboardLayout(DEFAULT_DASHBOARD_LAYOUT).sections.map(
      sectionIdOfBlock,
    );
    const beforeChange = real.filter((id) => id !== "cityleague");

    const merged = mergeIntoStoredOrder(beforeChange, real);

    expect(merged).toEqual(real);
    expect(merged[merged.indexOf("streak") + 1]).toBe("cityleague");
  });
});

describe("applyOrderMigrations", () => {
  // 常時表示にする前に表示設定を触っていたユーザーの保存値。cityleague が末尾にある
  const stale = [
    "onboarding_badges",
    "streak",
    "my_gyms",
    "designation",
    "calendar",
    "cityleague",
  ];

  it("版が無い保存値はシティリーグをストリークの直後へ戻す", () => {
    expect(applyOrderMigrations(stale, undefined)).toEqual([
      "onboarding_badges",
      "streak",
      "cityleague",
      "my_gyms",
      "designation",
      "calendar",
    ]);
  });

  // 直したあとは版を付けて保存し直すので、次からは動かさない
  // (ここで毎回動かすと、ユーザーが自分で置いた位置を巻き戻してしまう)
  it("現在の版が付いていれば並びを変えない", () => {
    expect(applyOrderMigrations(stale, DASHBOARD_ORDER_VERSION)).toEqual(stale);
  });

  it("ストリークかシティリーグが無ければ何もしない", () => {
    const noCityleague = ["streak", "my_gyms"];
    const noStreak = ["my_gyms", "cityleague"];

    expect(applyOrderMigrations(noCityleague, undefined)).toEqual(noCityleague);
    expect(applyOrderMigrations(noStreak, undefined)).toEqual(noStreak);
  });

  it("すでにストリークの直後にあれば並びは変わらない", () => {
    const already = ["streak", "cityleague", "my_gyms"];

    expect(applyOrderMigrations(already, undefined)).toEqual(already);
  });

  // 「ストリーク → 本日のシティリーグ結果 → Myジムのイベント」になること
  it("差し込みと組み合わせても Myジムの手前に入る", () => {
    const real = splitDashboardLayout(DEFAULT_DASHBOARD_LAYOUT).sections.map(
      sectionIdOfBlock,
    );

    const merged = mergeIntoStoredOrder(stale, real);
    const migrated = applyOrderMigrations(merged, undefined);
    const streak = migrated.indexOf("streak");

    expect(migrated[streak + 1]).toBe("cityleague");
    expect(migrated[streak + 2]).toBe("my_gyms");
  });
});

describe("sectionIdOfBlock", () => {
  it("中身が2種類ある節だけ設定のキーへ戻す", () => {
    expect(sectionIdOfBlock("environment_meta_window")).toBe("environment_meta");
    expect(sectionIdOfBlock("designation_linked")).toBe("designation");
    expect(sectionIdOfBlock("cityleague_off_season")).toBe("cityleague");
    expect(sectionIdOfBlock("streak")).toBe("streak");
  });
});

describe("initialSectionStateFromLayout", () => {
  const sectionIds = [
    "onboarding_badges",
    "streak",
    "cityleague",
    "designation",
    "environment_meta",
    "calendar",
  ];

  it("cookie が無ければ null(骨格で繋ぐ)", () => {
    expect(initialSectionStateFromLayout(undefined, sectionIds)).toBeNull();
    expect(initialSectionStateFromLayout([], sectionIds)).toBeNull();
  });

  // 前回描いた順序は保ちつつ、描いていない節は既定の位置へ差し込んで非表示で始める
  it("cookie の順序を保ち、cookie に無い節は既定の位置で非表示にする", () => {
    const state = initialSectionStateFromLayout(
      ["calendar", "designation_linked", "streak"],
      sectionIds,
    );

    expect(state).toEqual({
      order: [
        "onboarding_badges",
        "calendar",
        "designation",
        "environment_meta",
        "streak",
        "cityleague",
      ],
      hidden: ["onboarding_badges", "cityleague", "environment_meta"],
    });
  });

  // 開催期間外に描いた cookie("cityleague_off_season")でも、同じ節として拾えること。
  // ここを取り違えると、シーズンが始まった日にパネルが非表示で始まってしまう
  it("シティリーグは開催期間外の骨格IDでも同じ節として拾う", () => {
    const state = initialSectionStateFromLayout(
      ["streak", "cityleague_off_season"],
      sectionIds,
    );

    // ストリークの直後に来ること(既定の並びと同じ位置)
    expect(state?.order.indexOf("cityleague")).toBe(state!.order.indexOf("streak") + 1);
    expect(state?.hidden).not.toContain("cityleague");
  });

  // pinned・trailing のブロックや、今回サーバが描かない節(記録3件未満のときの
  // 対戦環境データなど)は sectionIds に無いので無視する
  it("今回の節に無いIDは無視する", () => {
    const state = initialSectionStateFromLayout(
      ["profile", "badges", "streak", "recent_records"],
      sectionIds,
    );

    // 前回描いたのは streak だけ。残りは既定の位置に並び、すべて非表示で始まる
    expect(state?.order).toEqual(sectionIds);
    expect(state?.hidden).toEqual([
      "onboarding_badges",
      "cityleague",
      "designation",
      "environment_meta",
      "calendar",
    ]);
  });
});
