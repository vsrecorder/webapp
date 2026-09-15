// @vitest-environment jsdom
import { render, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";

import { summarizeMatches } from "@app/utils/matchStats";
import { RecordGetByIdResponseType } from "@app/types/record";

// 自由形式イベントの記録(イベント取得を1本モックするだけで描けるのでこれを使う)
const record = {
  id: "record-1",
  created_at: new Date("2026-09-01T00:00:00Z"),
  official_event_id: 0,
  tonamel_event_id: "",
  friend_id: "",
  user_id: "user-1",
  deck_id: "",
  deck_code_id: "",
  private_flg: false,
  ignore_stats_flg: false,
  regulation_id: 1,
  tcg_meister_url: "",
  memo: "",
  event_date: "2026-09-01T00:00:00Z",
  unofficial_event_id: "unofficial-1",
  tags: [],
} as unknown as RecordGetByIdResponseType;

// イベント(自由形式)と使用デッキの取得をまとめてモックする
function stubEventFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/decks/")) {
        return Response.json({
          id: "deck-1",
          name: "リザードンex",
          pokemon_sprites: [{ id: "0006", position: 1 }],
        });
      }
      return Response.json({
        id: "unofficial-1",
        title: "ジムバトル",
        date: "2026-09-01T00:00:00Z",
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
 * 自動 cleanup は入っていない(vitest の globals を有効にしていないため、
 * @testing-library/react が afterEach を登録できない)。前のテストの描画が
 * document に残るので、document 全体を見る screen ではなく container の中で探す。
 */
describe("RecordHero", () => {
  it("対戦結果が0件でも戦績パネルを出す", async () => {
    stubEventFetch();

    const { container } = render(
      <RecordHero record={record} setRecord={() => {}} stats={summarizeMatches([])} />,
    );
    const hero = within(container);

    await waitFor(() => expect(hero.getByText("ジムバトル")).toBeTruthy());

    // パネルを消すとイベント情報だけが全幅に伸び、対戦を1件足した瞬間にカードが組み替わる
    expect(hero.getByLabelText("勝率なし")).toBeTruthy();
  });

  it("対戦一覧の取得中は戦績パネルの骨格のままにする", async () => {
    stubEventFetch();

    const { container } = render(
      <RecordHero
        record={record}
        setRecord={() => {}}
        stats={summarizeMatches([])}
        loadingStats={true}
      />,
    );
    const hero = within(container);

    await waitFor(() => expect(hero.getByText("ジムバトル")).toBeTruthy());

    // 取得中の total 0 は「対戦0件」と見分けが付かないので、確定するまで「-」は出さない
    expect(hero.queryByLabelText("勝率なし")).toBeNull();
  });

  it("使用デッキが未登録でも区画を残す", async () => {
    stubEventFetch();

    const { container } = render(
      <RecordHero record={record} setRecord={() => {}} stats={summarizeMatches([])} />,
    );
    const hero = within(container);

    await waitFor(() => expect(hero.getByText("ジムバトル")).toBeTruthy());

    // 区画ごと消すと、ローディングの骨格(使用デッキを必ず出す)から実体へ変わる瞬間に
    // カードが 108.5px 縮む
    expect(hero.getByText("使用デッキ")).toBeTruthy();
    expect(hero.getByText("未登録")).toBeTruthy();
  });

  it("使用デッキが登録済みならデッキ名を出す", async () => {
    stubEventFetch();

    const { container } = render(
      <RecordHero
        record={{ ...record, deck_id: "deck-1" }}
        setRecord={() => {}}
        stats={summarizeMatches([])}
      />,
    );
    const hero = within(container);

    await waitFor(() => expect(hero.getByText("リザードンex")).toBeTruthy());
    expect(hero.queryByText("未登録")).toBeNull();
  });
});
