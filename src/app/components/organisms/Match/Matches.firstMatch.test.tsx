// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";

/*
 * 1戦目を足したときに、対戦追加のモーダル(とその上の環境リターン)が消えないこと。
 *
 * 追加ボタンは「0件の空状態の中」と「一覧の下」の2か所にある。モーダルをボタン側に
 * 持たせていた頃は、1戦目で0件→1件に変わった瞬間に空状態のボタンごとモーダルが破棄され、
 * 環境リターン(追加の後に開く)が一度も出なかった。
 */
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@app/utils/recordingNowClient", () => ({ refreshRecordingNow: vi.fn() }));
vi.mock("@app/components/organisms/Match/Modal/UpdateMatchModal", () => ({
  default: () => null,
}));
vi.mock("@app/components/organisms/Match/Modal/DisplayMatchDetailModal", () => ({
  default: () => null,
}));

const firstMatch = {
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

/*
 * 入力モーダルの代わり。本物と同じく、追加(setMatches)の後で環境リターンを開く。
 * 状態はこのモーダル自身が持つので、モーダルが破棄されると環境リターンも消える。
 */
vi.mock("@app/components/organisms/Match/Modal/CreateMatchModal", () => ({
  default: function FakeCreateMatchModal({
    isOpen,
    setMatches,
  }: {
    isOpen: boolean;
    setMatches: (
      update: (prev: MatchGetResponseType[] | null) => MatchGetResponseType[],
    ) => void;
  }) {
    const [returnOpen, setReturnOpen] = useState(false);
    if (returnOpen) return <div>環境リターン</div>;
    if (!isOpen) return null;
    return (
      <button
        onClick={() => {
          setMatches((prev) => [...(prev ?? []), firstMatch]);
          setReturnOpen(true);
        }}
      >
        ダミー追加
      </button>
    );
  },
}));

const Matches = (await import("@app/components/organisms/Match/Matches")).default;

const record = {
  id: "01M2J6M2XH8JVG6VZT4RF889TE",
} as unknown as RecordGetByIdResponseType;

function Page() {
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>([]);
  return (
    <Matches
      record={record}
      matches={matches}
      setMatches={setMatches}
      loading={false}
      enableCreateMatchModalButton
      enableUpdateMatchModalButton
      flat
    />
  );
}

afterEach(cleanup);

describe("Matches の1戦目の追加", () => {
  it("空状態のボタンから1戦目を足しても、環境リターンまで進める", () => {
    render(<Page />);

    // 0件の空状態の中にある追加ボタン
    expect(screen.getByText("対戦結果がありません")).toBeTruthy();
    fireEvent.click(screen.getByText("対戦結果を追加する"));

    fireEvent.click(screen.getByText("ダミー追加"));

    // 1件になって空状態は消えるが、モーダルは残って環境リターンを出せる
    expect(screen.queryByText("対戦結果がありません")).toBeNull();
    expect(screen.getByText("環境リターン")).toBeTruthy();
  });
});
