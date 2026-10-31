// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { watchPopupClosed } from "./popupClosedWatch";

/*
 * ポップアップの閉じ検知。window.open を一時的に包んで参照を控え、閉じられたら猶予のあとに知らせる。
 * 実際のウィンドウは開かず、closed だけを持つ偽物を window.open から返して時間を進める
 */

type FakePopup = { closed: boolean };

const realOpen = window.open;
let popup: FakePopup;
let open: ReturnType<typeof vi.fn>;

// window.open の包みはモジュールで共有しているので、テストごとに見張りを必ず止めて次に持ち越さない
let stops: Array<() => void> = [];
const startWatch: typeof watchPopupClosed = (onClosed, options) => {
  const stop = watchPopupClosed(onClosed, options);
  stops.push(stop);
  return stop;
};

beforeEach(() => {
  vi.useFakeTimers();
  popup = { closed: false };
  open = vi.fn(() => popup as unknown as Window);
  window.open = open as unknown as typeof window.open;
});

afterEach(() => {
  stops.forEach((stop) => stop());
  stops = [];
  window.open = realOpen;
  vi.useRealTimers();
});

// Firebase の signInWithPopup がするのと同じ形で開く
const openPopup = () =>
  window.open("https://example.test/__/auth/handler", "auth", "width=500,height=600");

describe("watchPopupClosed", () => {
  it("開かれたポップアップが閉じられると、次の周期で気づき、猶予のあとに 1 回だけ知らせる", () => {
    const onClosed = vi.fn();
    startWatch(onClosed, { pollMs: 500, graceMs: 1500 });

    expect(openPopup()).toBe(popup);
    expect(open).toHaveBeenCalledWith(
      "https://example.test/__/auth/handler",
      "auth",
      "width=500,height=600",
    );

    // 開いている間は何も起きない
    vi.advanceTimersByTime(10_000);
    expect(onClosed).not.toHaveBeenCalled();

    popup.closed = true;
    // 次の周期(500ms)で閉じたのに気づく
    vi.advanceTimersByTime(500);
    // 猶予(1500ms)が明けるまでは知らせない
    vi.advanceTimersByTime(1499);
    expect(onClosed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onClosed).toHaveBeenCalledTimes(1);

    // その後は何度周期が来ても知らせない
    vi.advanceTimersByTime(10_000);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("最初の 1 回を捕まえたら window.open を元に戻し、2 回目以降は素通りさせる", () => {
    startWatch(vi.fn());
    expect(window.open).not.toBe(open);

    openPopup();
    expect(window.open).toBe(open);

    const second = { closed: false };
    open.mockReturnValueOnce(second as unknown as Window);
    expect(window.open("https://example.test/other")).toBe(second);
  });

  it("やめると以後は知らせず、window.open も元に戻る", () => {
    const onClosed = vi.fn();
    const stop = startWatch(onClosed, { pollMs: 500, graceMs: 1500 });

    openPopup();
    popup.closed = true;
    // 閉じたのに気づいて猶予に入ったところでやめる(Firebase の結果が先に届いた場面)
    vi.advanceTimersByTime(500);
    stop();

    vi.advanceTimersByTime(10_000);
    expect(onClosed).not.toHaveBeenCalled();
    expect(window.open).toBe(open);
  });

  it("ポップアップが開かれる前にやめても window.open は元に戻り、その後に開かれても見張らない", () => {
    const onClosed = vi.fn();
    const stop = startWatch(onClosed, { pollMs: 500, graceMs: 1500 });

    expect(window.open).not.toBe(open);
    stop();
    expect(window.open).toBe(open);

    openPopup();
    popup.closed = true;
    vi.advanceTimersByTime(10_000);
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("見張っている間に他所が window.open を差し替えていたら、戻すときに上書きしない", () => {
    const stop = startWatch(vi.fn());
    const other = vi.fn() as unknown as typeof window.open;
    window.open = other;

    stop();
    expect(window.open).toBe(other);
  });

  it("ブロックされて null が返ったときは何もしない", () => {
    open.mockReturnValue(null);
    const onClosed = vi.fn();
    startWatch(onClosed);

    expect(openPopup()).toBeNull();
    expect(window.open).toBe(open);

    vi.advanceTimersByTime(60_000);
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("ポップアップから戻ってきた(visibilitychange / focus)ときは周期を待たずに確かめる", () => {
    const onClosed = vi.fn();
    startWatch(onClosed, { pollMs: 5000, graceMs: 1000 });

    openPopup();
    popup.closed = true;
    document.dispatchEvent(new Event("visibilitychange"));

    // 周期(5000ms)を待たず、猶予(1000ms)だけで知らせる
    vi.advanceTimersByTime(1000);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("猶予の間に何度戻ってきても、知らせるのは 1 回で猶予も延びない", () => {
    const onClosed = vi.fn();
    startWatch(onClosed, { pollMs: 5000, graceMs: 1000 });

    openPopup();
    popup.closed = true;
    window.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));

    vi.advanceTimersByTime(500);
    expect(onClosed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  describe("shouldIgnoreClose(結果を処理中なので閉じても「やめた」ではない)", () => {
    it("閉じたのを見つけたときに真なら、知らせずに見張りをやめる", () => {
      let ignore = true;
      const onClosed = vi.fn();
      startWatch(onClosed, { pollMs: 500, graceMs: 1500, shouldIgnoreClose: () => ignore });

      openPopup();
      popup.closed = true;
      vi.advanceTimersByTime(500);

      // やめているので、その後に偽へ戻っても知らせない
      ignore = false;
      vi.advanceTimersByTime(10_000);
      expect(onClosed).not.toHaveBeenCalled();
    });

    it("猶予の間に真になったら、猶予が明けても知らせない", () => {
      let ignore = false;
      const onClosed = vi.fn();
      startWatch(onClosed, { pollMs: 500, graceMs: 1500, shouldIgnoreClose: () => ignore });

      openPopup();
      popup.closed = true;
      vi.advanceTimersByTime(500); // 閉じたのに気づいて猶予に入る
      ignore = true;
      vi.advanceTimersByTime(1500);
      expect(onClosed).not.toHaveBeenCalled();

      ignore = false;
      vi.advanceTimersByTime(10_000);
      expect(onClosed).not.toHaveBeenCalled();
    });
  });

  describe("見張りが重なったとき", () => {
    it("window.open を包むのは 1 回で、開かれたポップアップは待っている見張り全部に渡る", () => {
      const onClosedA = vi.fn();
      const onClosedB = vi.fn();
      startWatch(onClosedA, { pollMs: 500, graceMs: 1500 });
      const wrappedOnce = window.open;
      startWatch(onClosedB, { pollMs: 500, graceMs: 1500 });
      expect(window.open).toBe(wrappedOnce);

      openPopup();
      expect(open).toHaveBeenCalledTimes(1);
      expect(window.open).toBe(open);

      popup.closed = true;
      vi.advanceTimersByTime(500 + 1500);
      expect(onClosedA).toHaveBeenCalledTimes(1);
      expect(onClosedB).toHaveBeenCalledTimes(1);
    });

    it("先に始めた見張りがやめても、後の見張りはポップアップを捕まえ、やめると元に戻る", () => {
      const onClosedA = vi.fn();
      const onClosedB = vi.fn();
      const stopA = startWatch(onClosedA, { pollMs: 500, graceMs: 1500 });
      startWatch(onClosedB, { pollMs: 500, graceMs: 1500 });

      stopA();
      // B がまだ待っているので包んだまま
      expect(window.open).not.toBe(open);

      openPopup();
      expect(window.open).toBe(open);

      popup.closed = true;
      vi.advanceTimersByTime(500 + 1500);
      expect(onClosedA).not.toHaveBeenCalled();
      expect(onClosedB).toHaveBeenCalledTimes(1);
    });

    it("開かれる前に全部やめたら、その時点で元に戻る", () => {
      const stopA = startWatch(vi.fn());
      const stopB = startWatch(vi.fn());

      stopA();
      expect(window.open).not.toBe(open);
      stopB();
      expect(window.open).toBe(open);
    });
  });
});
