// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
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

const { default: Matches, restoreMatchOrder } = await import(
  "@app/components/organisms/Match/Matches"
);

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

/*
 * 並び替えの矢印は続けて押される。以前は押すたびに別々の PUT を送っていたので、届く順番が
 * 前後するとサーバには古い並びが残り、先のぶんが失敗すると画面だけ昔の並びへ戻っていた。
 */
describe("Matches の並び替え", () => {
  const useState = React.useState;
  const m = (id: string) => ({ ...match, id, opponents_deck_info: id }) as MatchGetResponseType;
  const ORDER_URL = `/api/records/${record.id}/matches/order`;

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // 一覧は親が持つ。並びをそのまま読めるよう、id の列を表示する
  function Harness({ initial }: { initial: MatchGetResponseType[] }) {
    const [matches, setMatches] = useState<MatchGetResponseType[] | null>(initial);

    return (
      <>
        <div data-testid="order">{(matches ?? []).map((x) => x.id).join(",")}</div>
        <Matches
          record={record}
          matches={matches}
          setMatches={setMatches}
          loading={false}
          enableCreateMatchModalButton={false}
          enableUpdateMatchModalButton
          flat
        />
      </>
    );
  }

  const order = () => screen.getByTestId("order").textContent;
  // n 番目(0 始まり)の対戦の「下に移動」
  const moveDown = (n: number) =>
    fireEvent.click(screen.getAllByRole("button", { name: "下に移動" })[n]);

  // PUT を受けた順に記録し、テストから 1 本ずつ応答を返せるようにする
  function stubOrderApi() {
    const requests: { ids: string[]; respond: (ok: boolean) => void }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string, init?: RequestInit) =>
          new Promise<Response>((resolve) => {
            if (String(url) !== ORDER_URL) return resolve(new Response("[]"));

            const body = JSON.parse(String(init?.body)) as { matches: { id: string }[] };
            requests.push({
              ids: body.matches.map((x) => x.id),
              respond: (ok) => resolve(new Response("{}", { status: ok ? 200 : 500 })),
            });
          }),
      ),
    );

    return requests;
  }

  it("送信中に続けて押されたぶんは、終わってから最新の並びを 1 回で送る", async () => {
    const requests = stubOrderApi();
    render(<Harness initial={[m("a"), m("b"), m("c"), m("d")]} />);

    // a を 3 回続けて下へ(送信の完了を待たない)
    moveDown(0);
    moveDown(1);
    moveDown(2);

    // 画面はすぐ最新の並びになる
    expect(order()).toBe("b,c,d,a");
    // 送っているのは最初の 1 本だけ
    expect(requests.map((r) => r.ids.join(","))).toEqual(["b,a,c,d"]);

    await act(async () => requests[0].respond(true));

    // 途中の並び(b,c,a,d)は送らず、最新の並びを 1 回で送る
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].ids.join(",")).toBe("b,c,d,a");

    await act(async () => requests[1].respond(true));
    expect(order()).toBe("b,c,d,a");
    expect(requests).toHaveLength(2);
  });

  it("失敗したら、サーバが受け付けた最後の並びへ戻し、送信待ちのぶんも捨てる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const requests = stubOrderApi();
    render(<Harness initial={[m("a"), m("b"), m("c")]} />);

    // 1 回目は通す
    moveDown(0);
    await act(async () => requests[0].respond(true));
    expect(order()).toBe("b,a,c");

    // 2 回目を送っている最中に 3 回目を押し、2 回目を失敗させる
    moveDown(1);
    moveDown(0);
    expect(order()).toBe("c,b,a");
    await act(async () => requests[1].respond(false));

    // 通った 1 回目の並びへ戻る(最初の a,b,c ではない)。送信待ちだった 3 回目は送らない
    await waitFor(() => expect(order()).toBe("b,a,c"));
    expect(requests).toHaveLength(2);
  });

  it("失敗のあと、もう一度押せば送り直せる", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const requests = stubOrderApi();
    render(<Harness initial={[m("a"), m("b")]} />);

    moveDown(0);
    await act(async () => requests[0].respond(false));
    await waitFor(() => expect(order()).toBe("a,b"));

    moveDown(0);
    expect(requests).toHaveLength(2);
    await act(async () => requests[1].respond(true));
    expect(order()).toBe("b,a");
  });
});

describe("restoreMatchOrder", () => {
  const m = (id: string, extra: Partial<MatchGetResponseType> = {}) =>
    ({ ...match, id, ...extra }) as MatchGetResponseType;

  it("順番と、予選/決勝のしるしだけを戻す(送信中に直された中身は保つ)", () => {
    const confirmed = [m("a"), m("b", { qualifying_round_flg: true })];
    // b を上へ動かして予選のしるしが外れ、その間に a のメモが直された
    const current = [
      m("b", { qualifying_round_flg: false }),
      m("a", { memo: "直したメモ" } as Partial<MatchGetResponseType>),
    ];

    const restored = restoreMatchOrder(current, confirmed)!;

    expect(restored.map((x) => x.id)).toEqual(["a", "b"]);
    expect(restored[1].qualifying_round_flg).toBe(true);
    expect((restored[0] as unknown as { memo: string }).memo).toBe("直したメモ");
  });

  it("送信中に足された対戦は消さず、末尾に残す", () => {
    const restored = restoreMatchOrder([m("b"), m("new"), m("a")], [m("a"), m("b")])!;

    expect(restored.map((x) => x.id)).toEqual(["a", "b", "new"]);
  });

  it("一覧がまだ無ければ何もしない", () => {
    expect(restoreMatchOrder(null, [m("a")])).toBeNull();
  });
});
