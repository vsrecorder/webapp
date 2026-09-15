// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MatchSummaryType } from "@app/types/match";
import { RecordGetByIdResponseType } from "@app/types/record";
import {
  RECORDING_WINDOW_AFTER_MATCH_MS,
  RECORDING_WINDOW_NO_MATCH_MS,
} from "@app/utils/recordingNow";

// 計測はこのカードの表示とは別物なので、描画の検証からは外す
vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));

// jsdom は ResizeObserver を持たない。イベント名を流す ScrollingText が
// 溢れ判定に使うので、何もしない形で埋めておく(溢れの有無はここでは見ない)
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// 『対戦結果を追加する』は記録詳細ページへの遷移。押した結果だけを見る
const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const RecordingNowCard = (await import("@app/components/organisms/Dashboard/RecordingNowCard"))
  .default;

const record = {
  id: "01M2J6M2XH8JVG6VZT4RF889TE",
  created_at: new Date("2026-09-15T09:40:00+09:00"),
  official_event_id: 0,
  tonamel_event_id: "",
  friend_id: "",
  user_id: "u1",
  deck_id: "d1",
  deck_code_id: "",
  private_flg: true,
  ignore_stats_flg: false,
  regulation_id: 1,
  tcg_meister_url: "",
  memo: "",
  event_date: "2026-09-15T00:00:00Z",
  unofficial_event_id: "e1",
  tags: [],
} as unknown as RecordGetByIdResponseType;

const summary: MatchSummaryType = {
  total: 4,
  wins: 3,
  losses: 1,
  draws: 0,
  has_group_match: false,
  has_bo3: false,
  last_match_at: minutesAgo(42),
};

// 実行時刻からの相対で作る。9時間の窓の内外はここで決まるので、
// システム時計を固定しなくてもテストが成立する
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function renderCard(props: Partial<Parameters<typeof RecordingNowCard>[0]> = {}) {
  return render(
    <RecordingNowCard
      record={record}
      eventTitle="第12回 ジムバトル"
      eventIconUrl={null}
      venue="カードショップ○○"
      deck={{ id: "d1", name: "リザードンex", pokemon_sprites: [] }}
      summary={summary}
      lastActiveAt={minutesAgo(42)}
      windowMs={RECORDING_WINDOW_AFTER_MATCH_MS}
      initialElapsedLabel="42分前"
      {...props}
    />,
  );
}

describe("RecordingNowCard", () => {
  beforeEach(() => {
    // cookie を毎回まっさらにする(「記録を終える」の検証が前のテストを引きずらないように)
    document.cookie = "recordingDismissed=; Path=/; Max-Age=0";
    document.cookie = "dashboardLayout=; Path=/; Max-Age=0";
    sessionStorage.clear();
    push.mockClear();
    refresh.mockClear();
  });

  // vitest は globals を有効にしていないため、描画の後片付けは自分で行う
  // (残すと次のテストで同じ文言が2つ見つかる)
  afterEach(cleanup);

  it("イベント名・使用デッキ・戦績と追加ボタンを出す", () => {
    renderCard();

    expect(screen.getAllByText("第12回 ジムバトル").length).toBeGreaterThan(0);
    // 会場は対戦記録カードと同じ部品(RecordMetaRows)で出す
    expect(screen.getByText("カードショップ○○")).toBeTruthy();
    expect(screen.getByText("リザードンex")).toBeTruthy();
    expect(screen.getByText("記録中")).toBeTruthy();
    expect(screen.getByText("3勝1敗")).toBeTruthy();
    expect(screen.getByText("対戦結果を追加する")).toBeTruthy();
  });

  it("対戦がまだ0件でも出す（作ったばかりの記録を弾かない）", () => {
    renderCard({
      summary: { ...summary, total: 0, wins: 0, losses: 0, last_match_at: null },
      lastActiveAt: minutesAgo(5),
      windowMs: RECORDING_WINDOW_NO_MATCH_MS,
      initialElapsedLabel: "5分前",
    });

    expect(screen.getByText("まだ0戦")).toBeTruthy();
    expect(screen.getByText("対戦結果を追加する")).toBeTruthy();
  });

  it("使用デッキが未登録なら、その行ごと出さない", () => {
    renderCard({ deck: null });

    // 「未登録」とだけ書かれた行は場所を取るだけなので置かない
    expect(screen.queryByText("使用デッキ未登録")).toBeNull();
    expect(screen.getAllByText("第12回 ジムバトル").length).toBeGreaterThan(0);
  });

  it("集計が取れなかったときは勝敗を出さない（0勝0敗と誤解させない）", () => {
    renderCard({ summary: null });

    expect(screen.queryByText("まだ0戦")).toBeNull();
    expect(screen.queryByText("3勝1敗")).toBeNull();
    // カード自体は出る(追記はできる)
    expect(screen.getByText("対戦結果を追加する")).toBeTruthy();
  });

  it("「対戦結果を追加する」で記録詳細ページへ移り、着いた先で開くよう指示を残す", () => {
    renderCard();
    fireEvent.click(screen.getByText("対戦結果を追加する"));

    // 遷移先の CreateMatchModalButton がこれを読んでモーダルを開く
    expect(sessionStorage.getItem("openCreateMatchRecordId")).toBe(
      "01M2J6M2XH8JVG6VZT4RF889TE",
    );
    expect(push).toHaveBeenCalledWith("/records/01M2J6M2XH8JVG6VZT4RF889TE");
  });

  it("「記録を終える」でカードが消え、その記録IDが cookie に残る", async () => {
    renderCard();
    fireEvent.click(screen.getByText("記録終了"));

    // 押し間違い防止に確認を挟む。ここではまだ消えない
    expect(screen.getAllByText("第12回 ジムバトル").length).toBeGreaterThan(0);
    expect(document.cookie).not.toContain("recordingDismissed=2");

    // モーダル側の「記録を終える」を押して初めて終わる
    const confirmButtons = await screen.findAllByText("記録終了");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    // モーダルの閉じるアニメーションが済むまで DOM に残る
    await waitFor(() =>
      expect(screen.queryAllByText("第12回 ジムバトル")).toHaveLength(0),
    );
    // 日付は含めない。記録中が日付をまたぐので、0時で戻ってきては困る
    expect(document.cookie).toContain(
      "recordingDismissed=01M2J6M2XH8JVG6VZT4RF889TE",
    );
  });

  /*
   * ホームの骨格は「前回描いた並び」(dashboardLayout cookie)で出る。閉じたあとも
   * 並びに残っていると、次に開いたときに実物の無い骨格だけが数秒ぶん居座る。
   */
  it("閉じたら骨格の並びからも「記録中」を外し、サーバ側の構成も取り直す", async () => {
    document.cookie =
      "dashboardLayout=profile%2Crecording_now%2Cstreak%2Crecent_records; Path=/";

    renderCard();
    fireEvent.click(screen.getByText("記録終了"));

    const confirmButtons = await screen.findAllByText("記録終了");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(decodeURIComponent(document.cookie)).toContain(
      "dashboardLayout=profile,streak,recent_records",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("最後の対戦から6時間を過ぎていれば出さない", () => {
    // 開いた時点の判定はサーバが済ませているが、ホームを開いたままだと
    // 描画したあとに窓を過ぎることがある
    renderCard({ lastActiveAt: minutesAgo(7 * 60), initialElapsedLabel: "7時間前" });

    expect(screen.queryAllByText("第12回 ジムバトル")).toHaveLength(0);
  });

  it("対戦がまだ0件なら、同じ経過時間でも18時間までは出す", () => {
    renderCard({
      summary: { ...summary, total: 0, wins: 0, losses: 0, last_match_at: null },
      lastActiveAt: minutesAgo(7 * 60),
      windowMs: RECORDING_WINDOW_NO_MATCH_MS,
      initialElapsedLabel: "7時間前",
    });

    expect(screen.getAllByText("第12回 ジムバトル").length).toBeGreaterThan(0);
  });

  it("イベント名が取れなければ、対戦記録カードと同じ代替文言を出す", () => {
    renderCard({ eventTitle: "" });

    // ScrollingText は溢れ判定用の不可視コピーも持つため、1つ以上あることだけ見る
    expect(screen.getAllByText("無題のイベント").length).toBeGreaterThan(0);
  });
});
