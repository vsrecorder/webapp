// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecordingNowBarType } from "@app/types/recording_now";
import { OPEN_CREATE_MATCH_RECORD_ID } from "@app/utils/createMatchIntent";
import {
  RECORDING_BAR_HIDDEN_KEY,
  RECORDING_BAR_HIDDEN_MS,
  recordingBarHiddenValue,
} from "@app/utils/recordingNow";

const RECORD_ID = "01M2J6M2XH8JVG6VZT4RF889TE";

vi.mock("@next/third-parties/google", () => ({ sendGAEvent: vi.fn() }));

const { push, refresh, pathname } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  pathname: { current: "/decks" },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => pathname.current,
}));

// jsdom は ResizeObserver を持たない。イベント名を流す ScrollingText が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const RecordingNowBar = (
  await import("@app/components/organisms/Layout/RecordingNowBar")
).default;

const recording: RecordingNowBarType = {
  recordId: RECORD_ID,
  eventTitle: "ジムバトル",
  eventIconUrl: "https://example.test/icons/gym.png",
  eventKind: "official",
  venue: "カードショップ○○",
  total: 4,
  wins: 3,
  losses: 1,
  draws: 0,
  hasSummary: true,
};

/*
 * SWR のキャッシュはグローバルなので、包まずに描くと前のテストの結果が残る。
 * テストごとに空のキャッシュを与え、間引きも無効にして必ず取りに行かせる。
 */
function renderBar() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <RecordingNowBar />
    </SWRConfig>,
  );
}

function mockFetch(body: { recording: RecordingNowBarType | null }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => body })),
  );
}

describe("RecordingNowBar", () => {
  beforeEach(() => {
    pathname.current = "/decks";
    sessionStorage.clear();
    document.cookie = "recordingDismissed=; Path=/; Max-Age=0";
    push.mockClear();
    refresh.mockClear();
    mockFetch({ recording });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("記録中なら、イベント名・会場・勝敗と追加ボタンを出す", async () => {
    renderBar();

    // ScrollingText は溢れ判定用の不可視コピーも持つ
    expect((await screen.findAllByText("ジムバトル")).length).toBeGreaterThan(0);
    expect(screen.getByText("カードショップ○○")).toBeTruthy();
    expect(screen.getByText("3勝1敗")).toBeTruthy();
    expect(screen.getByText("対戦結果")).toBeTruthy();
  });

  /*
   * Tonamel・自由形式のイベントは会場を持たない。下段がボタンだけになるので、
   * 右へ寄せずに幅いっぱいへ広げ、ラベルも省略しない。
   */
  it("会場が無いイベントでも、追加ボタンは公式イベントと同じ形にする", async () => {
    mockFetch({ recording: { ...recording, venue: "", eventKind: "tonamel" } });

    renderBar();

    // 押す場所を種別で変えない。会場の行が無いぶんボタンは右へ寄る
    expect(await screen.findByText("対戦結果")).toBeTruthy();
    expect(screen.queryByText("カードショップ○○")).toBeNull();
  });

  it("イベントのアイコンを出す", async () => {
    const { container } = renderBar();
    await screen.findByText("対戦結果");

    const icon = container.querySelector("img");
    expect(icon?.getAttribute("src")).toBe("https://example.test/icons/gym.png");
  });

  it("記録中でなければ何も出さない", async () => {
    mockFetch({ recording: null });

    const { container } = renderBar();

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  /*
   * ホームには上部に記録中カードもあるが、カードは画面の上にあって
   * 下までスクロールすると押せない。バーはどこにいても同じ位置にある。
   */
  it("ホームでも出す", async () => {
    pathname.current = "/";

    renderBar();

    expect((await screen.findAllByText("ジムバトル")).length).toBeGreaterThan(0);
  });

  it("記録作成ページでは出さない", async () => {
    pathname.current = "/records/create";

    const { container } = renderBar();

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("その記録の詳細ページでは出さない", async () => {
    pathname.current = `/records/${RECORD_ID}`;

    const { container } = renderBar();

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it("別の記録の詳細ページでは出す", async () => {
    pathname.current = "/records/01OTHERRECORDIDXXXXXXXXXXXX";

    renderBar();

    expect((await screen.findAllByText("ジムバトル")).length).toBeGreaterThan(0);
  });

  it("「対戦」で記録詳細ページへ移り、着いた先で開くよう指示を残す", async () => {
    renderBar();

    fireEvent.click(await screen.findByText("対戦結果"));

    expect(sessionStorage.getItem(OPEN_CREATE_MATCH_RECORD_ID)).toBe(RECORD_ID);
    expect(push).toHaveBeenCalledWith(`/records/${RECORD_ID}`);
  });

  /*
   * 「記録を終える」は、この大会がもう終わったという意思表示。
   * ホームのカードと同じ cookie に書いて両方消す。
   */
  it("「記録を終える」で cookie に残し、ホーム側も取り直させる", async () => {
    renderBar();

    fireEvent.click(await screen.findByText("記録終了"));

    // 押し間違い防止に確認を挟む。ここではまだ何も起きない
    expect(document.cookie).not.toContain("recordingDismissed=2");

    // モーダル側の「記録を終える」を押して初めて終わる
    const confirmButtons = await screen.findAllByText("記録終了");
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(decodeURIComponent(document.cookie)).toContain(`recordingDismissed=`);
    expect(decodeURIComponent(document.cookie)).toContain(RECORD_ID);
    expect(refresh).toHaveBeenCalled();
  });

  /*
   * 「×」はバーが邪魔なだけ。記録中であることは終わらせないので、
   * cookie には何も書かず、ホームのカードは残る。
   */
  it("「×」ではバーだけ引っ込み、記録は終わらせない", async () => {
    renderBar();
    await screen.findByText("対戦結果");

    fireEvent.click(screen.getByLabelText("このバーを閉じる"));

    await waitFor(() => expect(screen.queryByText("対戦結果")).toBeNull());
    expect(sessionStorage.getItem(RECORDING_BAR_HIDDEN_KEY)).toContain(RECORD_ID);
    // 記録を終えたことにはしない
    expect(document.cookie).not.toContain("recordingDismissed=2");
  });

  it("閉じた直後に開き直しても出さない", async () => {
    sessionStorage.setItem(
      RECORDING_BAR_HIDDEN_KEY,
      recordingBarHiddenValue(RECORD_ID, Date.now()),
    );

    const { container } = renderBar();

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  // 大会の合間に一度どけても、次の試合が終わる頃にはまた出ていてほしい
  it("閉じてから10分経っていれば出す", async () => {
    sessionStorage.setItem(
      RECORDING_BAR_HIDDEN_KEY,
      recordingBarHiddenValue(RECORD_ID, Date.now() - RECORDING_BAR_HIDDEN_MS - 1000),
    );

    renderBar();

    expect((await screen.findAllByText("ジムバトル")).length).toBeGreaterThan(0);
  });

  it("別の記録が記録中になれば、閉じた記憶は効かない", async () => {
    sessionStorage.setItem(
      RECORDING_BAR_HIDDEN_KEY,
      recordingBarHiddenValue("01OTHERRECORDIDXXXXXXXXXXXX", Date.now()),
    );

    renderBar();

    expect((await screen.findAllByText("ジムバトル")).length).toBeGreaterThan(0);
  });
});
