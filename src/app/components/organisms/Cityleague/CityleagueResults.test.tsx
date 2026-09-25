// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CityleagueResults from "@app/components/organisms/Cityleague/CityleagueResults";

import { CityleagueScheduleContext } from "@app/utils/cityleagueListServer";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/cityleague_results",
}));

// スケジュールはサーバで解決済みとして渡し、結果の取得だけを試す。
// 開催期間は1日だけにして、失敗が「遡る日付が尽きた」と紛れないようにする
const SCHEDULE_CONTEXT: CityleagueScheduleContext = {
  schedule: {
    id: "s1",
    title: "テストシーズン",
    from_date: new Date("2026-05-06"),
    to_date: new Date("2026-05-06"),
  } as CityleagueScheduleContext["schedule"],
  isOngoing: false,
  startDate: "2026-05-06",
};

function stubFetch(responses: ("ok" | "error")[]) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/cityleague_results")) {
        const mode = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return mode === "ok"
          ? Response.json({ count: 0, event_results: [] })
          : new Response('{"message":"error"}', { status: 500 });
      }
      return Response.json([]);
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CityleagueResults の取得失敗", () => {
  it("失敗を「直近のシティリーグ結果はありません」と区別して表示する", async () => {
    stubFetch(["error"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("シティリーグ結果を取得できませんでした")).toBeTruthy(),
    );
    expect(screen.queryByText("直近のシティリーグ結果はありません")).toBeNull();
  });

  it("結果が無いときは従来どおり空状態を出す", async () => {
    stubFetch(["ok"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("直近のシティリーグ結果はありません")).toBeTruthy(),
    );
    expect(screen.queryByText("シティリーグ結果を取得できませんでした")).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    stubFetch(["error", "ok"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("シティリーグ結果を取得できませんでした")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() =>
      expect(screen.getByText("直近のシティリーグ結果はありません")).toBeTruthy(),
    );
  });
});

describe("CityleagueResults の空状態の文言", () => {
  // 開催初日などは大会が終わるまで結果が無い。開催期間外の文言だと食い違うので切り替える
  it("開催中は「結果の登録待ち」を伝える", async () => {
    stubFetch(["ok"]);
    render(
      <CityleagueResults
        league_type={1}
        scheduleContext={{ ...SCHEDULE_CONTEXT, isOngoing: true }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("シティリーグの結果はまだありません")).toBeTruthy(),
    );
    expect(screen.queryByText("直近のシティリーグ結果はありません")).toBeNull();
    expect(screen.queryByText("次のシーズン開幕をお楽しみに")).toBeNull();
  });

  it("開催期間外は「次のシーズン待ち」を伝える", async () => {
    stubFetch(["ok"]);
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("次のシーズン開幕をお楽しみに")).toBeTruthy(),
    );
    expect(screen.queryByText("シティリーグの結果はまだありません")).toBeNull();
  });
});

describe("CityleagueResults の想定外の応答", () => {
  // 200 で {message: "..."} のような別の形が返ると、配列展開でページごと
  // エラー画面へ落ちていた。空として扱い、画面は保つ。
  it("200 で配列でない応答が返っても落ちない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "error" })),
    );
    render(<CityleagueResults league_type={1} scheduleContext={SCHEDULE_CONTEXT} />);

    await waitFor(() =>
      expect(screen.getByText("直近のシティリーグ結果はありません")).toBeTruthy(),
    );
  });
});
