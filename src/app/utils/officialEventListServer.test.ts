import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BUILD_VERSION_HEADER,
  getOfficialEventList,
} from "@app/utils/officialEventListServer";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getOfficialEventList", () => {
  it("Data Cache のキーを webapp のビルドごとに分けるため、ビルドの版をヘッダーに載せる", async () => {
    vi.stubEnv("VSRECORDER_DOMAIN", "vsrecorder.mobi");
    const fetchMock = vi.fn(async () =>
      Response.json({
        type_id: 0,
        league_type: 0,
        start_date: "2026-11-22",
        end_date: "2026-11-22",
        count: 0,
        official_events: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getOfficialEventList("", "", "2026-11-22");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1beta/official_events?type_id=&league_type=&date=2026-11-22");
    // テストではビルド時の埋め込みが無いので "dev" になる
    expect((init.headers as Record<string, string>)[BUILD_VERSION_HEADER]).toBe("dev");
    // キャッシュに載せる設定は従来どおり
    expect(init.cache).toBe("force-cache");
  });
});
