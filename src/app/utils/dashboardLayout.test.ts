import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD_LAYOUT,
  initialSectionStateFromLayout,
  isDashboardBlockId,
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

  it("cookie の順序を order にし、cookie に無い節は末尾に置いて非表示で始める", () => {
    const state = initialSectionStateFromLayout(
      ["calendar", "designation_linked", "streak"],
      sectionIds,
    );

    expect(state).toEqual({
      order: [
        "calendar",
        "designation",
        "streak",
        "onboarding_badges",
        "cityleague",
        "environment_meta",
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

    expect(state?.order.slice(0, 2)).toEqual(["streak", "cityleague"]);
    expect(state?.hidden).not.toContain("cityleague");
  });

  // pinned・trailing のブロックや、今回サーバが描かない節(記録3件未満のときの
  // 対戦環境データなど)は sectionIds に無いので無視する
  it("今回の節に無いIDは無視する", () => {
    const state = initialSectionStateFromLayout(
      ["profile", "badges", "streak", "recent_records"],
      sectionIds,
    );

    expect(state?.order[0]).toBe("streak");
    expect(state?.hidden).toEqual([
      "onboarding_badges",
      "cityleague",
      "designation",
      "environment_meta",
      "calendar",
    ]);
  });
});
