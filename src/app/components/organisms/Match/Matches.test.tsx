// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";

/*
 * 対戦の編集・詳細モーダルは、マウントすると相手デッキ候補などの取得が走る。
 * ここで見たいのはパネルの状態(骨格 / 対戦一覧 / 0件 / 取得失敗)の描き分けなので、
 * 中身は出さない形に置き換える。
 */
vi.mock("@app/components/organisms/Match/Modal/UpdateMatchModal", () => ({
  default: () => null,
}));
vi.mock("@app/components/organisms/Match/Modal/DisplayMatchDetailModal", () => ({
  default: () => null,
}));
vi.mock("@app/components/organisms/Match/CreateMatchModalButton", () => ({
  default: () => <button>対戦結果を追加する</button>,
  useCreateMatchModal: () => ({ open: () => {}, modal: null }),
}));

const Matches = (await import("@app/components/organisms/Match/Matches")).default;

const record = { id: "01M2J6M2XH8JVG6VZT4RF889TE" } as unknown as RecordGetByIdResponseType;

const match = {
  id: "m1",
  victory_flg: true,
  draw_flg: false,
  bo3_flg: false,
  group_match_flg: false,
  group_match_victory_flg: false,
  qualifying_round_flg: false,
  final_tournament_flg: false,
  default_victory_flg: false,
  default_defeat_flg: false,
  opponents_deck_info: "リザードンex",
  games: [{ go_first: true, your_prize_cards: 0, opponents_prize_cards: 0 }],
  pokemon_sprites: [],
  tags: [],
} as unknown as MatchGetResponseType;

type Overrides = Partial<React.ComponentProps<typeof Matches>>;

function renderMatches(overrides: Overrides = {}) {
  return render(
    <Matches
      record={record}
      matches={null}
      setMatches={vi.fn()}
      loading={false}
      enableCreateMatchModalButton={false}
      enableUpdateMatchModalButton={false}
      flat
      {...overrides}
    />,
  );
}

describe("Matches", () => {
  afterEach(() => cleanup());

  it("0件なら空状態を出す", () => {
    renderMatches({ matches: [] });

    expect(screen.getByText("対戦結果がありません")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "再読み込み" })).toBeNull();
  });

  it("取得に失敗したら、0件ではなく取り直せるエラーを出す", () => {
    renderMatches({ error: true, onRetry: vi.fn() });

    // 取得できていないだけの記録に「まだ何も無い」と言ってしまわない
    expect(screen.queryByText("対戦結果がありません")).toBeNull();
    expect(screen.getByText("対戦結果を取得できませんでした")).toBeTruthy();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeTruthy();
  });

  it("エラーの「再読み込み」で取り直す", () => {
    const onRetry = vi.fn();
    renderMatches({ error: true, onRetry });

    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("取り直し中もエラーを出したままにする", () => {
    renderMatches({ error: true, onRetry: vi.fn(), isRetrying: true, loading: true });

    // 骨格へ戻すと「エラー → 骨格 → エラー」と往復して見える
    expect(screen.getByText("対戦結果を取得できませんでした")).toBeTruthy();
  });

  it("対戦があれば一覧を出す", () => {
    renderMatches({ matches: [match] });

    expect(screen.getByText("リザードンex")).toBeTruthy();
    expect(screen.queryByText("対戦結果がありません")).toBeNull();
  });
});
