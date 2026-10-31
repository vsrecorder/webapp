// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchFetchStart } from "./fetchStartWatch";

/*
 * fetch の開始を見張る包み。条件に合う要求が始まった瞬間を知らせ、要求そのものは元の fetch に通す。
 * 実際の通信はせず、元の fetch は決まった値を返す偽物にする
 */

const realFetch = window.fetch;
let original: ReturnType<typeof vi.fn>;

// 包みはモジュールで共有しているので、テストごとに見張りを必ず止めて次に持ち越さない
let stops: Array<() => void> = [];
const startWatch: typeof watchFetchStart = (matches, onStart) => {
  const stop = watchFetchStart(matches, onStart);
  stops.push(stop);
  return stop;
};

const IDP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=k";
const isIdp = (url: string) => url.includes("accounts:signInWithIdp");

beforeEach(() => {
  original = vi.fn(async () => "response" as unknown as Response);
  window.fetch = original as unknown as typeof window.fetch;
});

afterEach(() => {
  stops.forEach((stop) => stop());
  stops = [];
  window.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("watchFetchStart", () => {
  it("条件に合う要求が始まったら知らせ、要求は引数ごと元の fetch に渡って結果もそのまま返る", async () => {
    const onStart = vi.fn();
    startWatch(isIdp, onStart);

    const result = await window.fetch(IDP_URL, { method: "POST" });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(original).toHaveBeenCalledWith(IDP_URL, { method: "POST" });
    expect(result).toBe("response");
  });

  it("条件に合わない要求では知らせない(要求は通す)", async () => {
    const onStart = vi.fn();
    startWatch(isIdp, onStart);

    await window.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=k");

    expect(onStart).not.toHaveBeenCalled();
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("URL オブジェクトや Request で呼ばれても判定できる", async () => {
    const onStart = vi.fn();
    startWatch(isIdp, onStart);

    await window.fetch(new URL(IDP_URL));
    await window.fetch(new Request(IDP_URL, { method: "POST" }));

    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it("文字列・URL・Request 以外の入力は「合わない」扱いで、要求は通し記録も出さない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const matches = vi.fn(isIdp);
    const onStart = vi.fn();
    startWatch(matches, onStart);

    const odd = { toString: () => IDP_URL } as unknown as RequestInfo;
    const result = await window.fetch(odd);

    expect(result).toBe("response");
    expect(original).toHaveBeenCalledWith(odd, undefined);
    // matches には空文字が渡り(例外にならない)、合わないので合図は出ない
    expect(matches).toHaveBeenCalledWith("");
    expect(onStart).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("this を付けずに呼ばれても動く(Firebase は FetchProvider.fetch()(url) の形で呼ぶ)", async () => {
    const onStart = vi.fn();
    startWatch(isIdp, onStart);

    const bare = window.fetch;
    const result = await bare(IDP_URL);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(original).toHaveBeenCalledTimes(1);
    expect(result).toBe("response");
  });

  it("やめると window.fetch は元に戻り、以後は知らせない", async () => {
    const onStart = vi.fn();
    const stop = startWatch(isIdp, onStart);
    expect(window.fetch).not.toBe(original);

    stop();
    expect(window.fetch).toBe(original);

    await window.fetch(IDP_URL);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("見張りが重なっても包みは 1 つで、全部やめたときに元に戻る", async () => {
    const onStartA = vi.fn();
    const onStartB = vi.fn();
    const stopA = startWatch(isIdp, onStartA);
    const wrappedOnce = window.fetch;
    const stopB = startWatch(isIdp, onStartB);
    expect(window.fetch).toBe(wrappedOnce);

    stopA();
    expect(window.fetch).toBe(wrappedOnce);

    await window.fetch(IDP_URL);
    expect(onStartA).not.toHaveBeenCalled();
    expect(onStartB).toHaveBeenCalledTimes(1);

    stopB();
    expect(window.fetch).toBe(original);
  });

  it("見張っている間に他所が window.fetch を差し替えていたら、戻すときに上書きしない", () => {
    const stop = startWatch(isIdp, vi.fn());
    const other = vi.fn() as unknown as typeof window.fetch;
    window.fetch = other;

    stop();
    expect(window.fetch).toBe(other);
  });

  it("知らせる側が例外を投げても要求は通る", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    startWatch(isIdp, () => {
      throw new Error("listener broke");
    });

    const result = await window.fetch(IDP_URL);

    expect(result).toBe("response");
    expect(original).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });
});
