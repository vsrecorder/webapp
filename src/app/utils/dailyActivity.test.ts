// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTIVITY_DECK_FORM,
  ACTIVITY_ONBOARDING_CTA,
  ACTIVITY_RECORD_FORM,
  ACTIVITY_VISIT,
  sendDailyActivity,
} from "@app/utils/dailyActivity";

// 送信済みの記録は localStorage に日付で入るので、テストごとに空にする
function resetStorage() {
  localStorage.clear();
}

describe("sendDailyActivity", () => {
  beforeEach(() => {
    resetStorage();
    vi.useFakeTimers();
    // JST の当日で間引くため、日付が変わる境界に依存しない固定時刻に置く
    vi.setSystemTime(new Date("2026-09-14T03:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetStorage();
  });

  function stubFetch(ok = true) {
    const fetchMock = vi.fn().mockResolvedValue({ ok } as Response);
    vi.stubGlobal("fetch", fetchMock);

    return fetchMock;
  }

  it("カテゴリをまとめて1リクエストで送る", async () => {
    const fetchMock = stubFetch();

    await sendDailyActivity([ACTIVITY_VISIT, ACTIVITY_ONBOARDING_CTA]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/users/activity");
    expect(JSON.parse(init.body as string)).toEqual({
      categories: [ACTIVITY_VISIT, ACTIVITY_ONBOARDING_CTA],
    });
  });

  /*
   * 空状態CTAはダッシュボードを開くたびにマウントされるので、間引きが効かないと
   * SPA遷移のたびにビーコンが飛ぶ。日次で1行に丸まる計測に対して無駄な負荷になる。
   */
  it("同じ日に送ったカテゴリは二度送らない", async () => {
    const fetchMock = stubFetch();

    await sendDailyActivity([ACTIVITY_ONBOARDING_CTA]);
    await sendDailyActivity([ACTIVITY_ONBOARDING_CTA]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("未送信のカテゴリだけを送る", async () => {
    const fetchMock = stubFetch();

    await sendDailyActivity([ACTIVITY_VISIT]);
    await sendDailyActivity([ACTIVITY_VISIT, ACTIVITY_RECORD_FORM]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      categories: [ACTIVITY_RECORD_FORM],
    });
  });

  // 失敗したら送信済みにしない。次のページ遷移で拾い直せるようにするため
  it("送信に失敗したカテゴリは次回また送る", async () => {
    const failing = stubFetch(false);

    await sendDailyActivity([ACTIVITY_DECK_FORM]);
    await sendDailyActivity([ACTIVITY_DECK_FORM]);

    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("送るものが無ければリクエストしない", async () => {
    const fetchMock = stubFetch();

    await sendDailyActivity([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // 計測の失敗でUIを壊さない（呼び出し側は void で投げっぱなしにしている）
  it("fetch が例外を投げても落ちない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(sendDailyActivity([ACTIVITY_VISIT])).resolves.toBeUndefined();
  });
});
