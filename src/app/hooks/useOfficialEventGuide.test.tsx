// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOfficialEventGuide } from "@app/hooks/useOfficialEventGuide";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

function stubFetch() {
  // 引数の型を明示する(省くと呼び出しの引数が空の組と推論され、URL を読むところで型が合わない)
  const spy = vi.fn(async (_url: string) => {
    void _url;

    return Response.json([{ id: 1, title: "ジムバトル", type_id: 4 }]);
  });
  vi.stubGlobal("fetch", spy);

  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/*
 * 自由形式のイベント名に公式イベントのキーワードがあると、その開催日の公式イベントを引いて
 * 切り替えを促す。開催日の入力欄は年を打ち直している途中の値も渡してくるので、その間は引かない
 * (上流が 400 を返し、SWR が再試行を繰り返す)。
 */
describe("useOfficialEventGuide", () => {
  it("キーワードがあり開催日が妥当なら、その日の公式イベントを引く", async () => {
    const spy = stubFetch();

    renderHook(() => useOfficialEventGuide("ジムバトル", "2026-11-24"), { wrapper });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(String(spy.mock.calls[0][0])).toBe("/api/official_events?date=2026-11-24");
  });

  it.each(["202-11-24", "20-11-24", "2-11-24", "0202-11-24"])(
    "開催日が入力途中の値(%s)のあいだは引かない",
    async (dateYmd) => {
      const spy = stubFetch();

      const { result } = renderHook(() => useOfficialEventGuide("ジムバトル", dateYmd), { wrapper });

      await Promise.resolve();
      expect(spy).not.toHaveBeenCalled();
      expect(result.current).toBeNull();
    },
  );

  it("キーワードが無ければ引かない", async () => {
    const spy = stubFetch();

    renderHook(() => useOfficialEventGuide("身内の対戦会", "2026-11-24"), { wrapper });

    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });
});
