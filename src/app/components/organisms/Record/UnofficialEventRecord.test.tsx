// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import UnofficialEventRecord from "@app/components/organisms/Record/UnofficialEventRecord";

import { RecordType } from "@app/types/record";

// jsdom は ResizeObserver を持たない。イベント名を流す ScrollingText が使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

/*
 * 一覧 API が付ける周辺情報(details)のうち、イベントとデッキは渡しておく。
 * こうするとカードが自分で取りに行くのは対戦の集計だけになり、その1本の成否だけを試せる。
 */
const recordData = {
  cursor: "c1",
  data: {
    id: "01M2J6M2XH8JVG6VZT4RF889TE",
    unofficial_event_id: "ue1",
    deck_id: "",
    official_event_id: 0,
    tonamel_event_id: "",
    event_date: "2026-09-24T00:00:00Z",
    created_at: "2026-09-24T00:00:00Z",
    regulation_id: 1,
    ignore_stats_flg: false,
    tags: [],
  },
  details: {
    unofficial_event: { id: "ue1", title: "テスト自由形式", date: "2026-09-24T00:00:00Z" },
  },
} as unknown as RecordType;

// 一覧の取り直しでカードが別の記録に差し替わったときの相手
const otherRecordData = {
  ...recordData,
  cursor: "c2",
  data: { ...recordData.data, id: "01M2J6M2XH8JVG6VZT4RF889TF" },
} as unknown as RecordType;

describe("UnofficialEventRecord の対戦集計", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("集計の取得に失敗したら「対戦なし」ではなく取り直しを出し、押すと取り直す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call++;
      // 1回目は失敗、再読み込み(2回目)で 2勝1敗
      if (call === 1) return { ok: false, status: 500 } as Response;
      return {
        ok: true,
        json: async () => [
          { victory_flg: true, draw_flg: false },
          { victory_flg: true, draw_flg: false },
          { victory_flg: false, draw_flg: false },
        ],
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <UnofficialEventRecord recordData={recordData} enableDisplayRecordModal={false} />,
    );

    // 失敗しても 0勝0敗(「対戦なし」)にはしない
    await waitFor(() =>
      expect(screen.getByLabelText("対戦結果を再読み込みする")).toBeTruthy(),
    );
    expect(screen.queryByText("対戦なし")).toBeNull();

    fireEvent.click(screen.getByLabelText("対戦結果を再読み込みする"));

    await waitFor(() => expect(screen.getByText(/2勝/)).toBeTruthy());
    expect(screen.queryByLabelText("対戦結果を再読み込みする")).toBeNull();
  });

  it("別の記録へ差し替わったら、前の記録の失敗を持ち越さない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const second: { resolve?: (value: Response) => void } = {};
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        // 1件目は失敗。2件目(差し替え後)は解決を保留し、取得中の表示を確かめる
        if (call === 1) return { ok: false, status: 500 } as Response;
        return new Promise<Response>((resolve) => {
          second.resolve = resolve;
        });
      }),
    );

    const { rerender } = render(
      <UnofficialEventRecord recordData={recordData} enableDisplayRecordModal={false} />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText("対戦結果を再読み込みする")).toBeTruthy(),
    );

    rerender(
      <UnofficialEventRecord
        recordData={otherRecordData}
        enableDisplayRecordModal={false}
      />,
    );

    // 差し替え後の記録はまだ取得中。前の記録の失敗をこの記録の失敗として出さない
    await waitFor(() => expect(call).toBe(2));
    expect(screen.queryByLabelText("対戦結果を再読み込みする")).toBeNull();

    second.resolve?.({
      ok: true,
      json: async () => [{ victory_flg: true, draw_flg: false }],
    } as Response);
    await waitFor(() => expect(screen.getByText(/1勝/)).toBeTruthy());
  });
});
