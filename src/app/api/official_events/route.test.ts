import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const getOfficialEventList = vi.fn();
vi.mock("@app/utils/officialEventListServer", () => ({
  getOfficialEventList: (...args: unknown[]) => getOfficialEventList(...args),
}));

const { GET } = await import("@app/api/official_events/route");

const call = (query: string) =>
  GET(new NextRequest(`https://vsrecorder.test/api/official_events${query}`));

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/official_events", () => {
  it("妥当な開催日は上流へ引きに行く", async () => {
    getOfficialEventList.mockResolvedValue({ official_events: [] });

    const res = await call("?date=2026-11-24");

    expect(res.status).toBe(200);
    expect(getOfficialEventList).toHaveBeenCalledWith("", "", "2026-11-24");
  });

  it("開催日を省いた要求はそのまま通す(上流は今日として扱う)", async () => {
    getOfficialEventList.mockResolvedValue({ official_events: [] });

    const res = await call("?type_id=2&league_type=1");

    expect(res.status).toBe(200);
    expect(getOfficialEventList).toHaveBeenCalledWith("2", "1", "");
  });

  // 年を打ち直している途中の値。上流も 400 を返すので、往復せずにここで断る
  it.each(["202-11-24", "20-11-24", "2-11-24", "0202-11-24", "2026-02-30", "today"])(
    "開催日として読めない値(%s)は上流へ送らず 400",
    async (date) => {
      const res = await call(`?date=${date}`);

      expect(res.status).toBe(400);
      expect(getOfficialEventList).not.toHaveBeenCalled();
    },
  );
});
